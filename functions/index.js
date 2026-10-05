const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

initializeApp();

const db = getFirestore();
const TIME_ZONE = 'Asia/Ho_Chi_Minh';
const NOTIFICATION_WINDOW_MS = 60 * 1000;
const CHECK_IN_GRACE_MS = 15 * 60 * 1000;
const INVALID_QR_MESSAGE = 'Mã không hợp lệ hoặc đã hết hạn';

const getBookingTimeRange = (date, slot) => {
  if (typeof date !== 'string' || typeof slot !== 'string') {
    throw new Error('Booking is missing its date or time slot.');
  }

  const match = slot.match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
  if (!match) throw new Error(`Invalid booking time slot "${slot}".`);

  const [, startHour, startMinute, endHour, endMinute] = match;
  const startTime = Date.parse(
    `${date}T${startHour.padStart(2, '0')}:${startMinute}:00+07:00`,
  );
  const endTime = Date.parse(
    `${date}T${endHour.padStart(2, '0')}:${endMinute}:00+07:00`,
  );
  if (
    Number.isNaN(startTime) ||
    Number.isNaN(endTime) ||
    endTime <= startTime
  ) {
    throw new Error(`Invalid booking time range for "${date}" and "${slot}".`);
  }
  return { startTime, endTime };
};

const localDateKey = (date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const writeNotificationOnce = async ({
  bookingId,
  booking,
  type,
  title,
  message,
}) => {
  if (typeof booking.userId !== 'string' || booking.userId.length === 0) {
    throw new Error(`Booking "${bookingId}" has no userId.`);
  }

  const notificationId = `${bookingId}_${type}`;
  const notificationRef = db.collection('notifications').doc(notificationId);
  await db.runTransaction(async (transaction) => {
    const notificationSnapshot = await transaction.get(notificationRef);
    if (notificationSnapshot.exists) return;
    transaction.create(notificationRef, {
      id: notificationId,
      userId: booking.userId,
      title,
      message,
      type,
      createdAt: FieldValue.serverTimestamp(),
      isRead: false,
    });
  });
};

const getStoredBookingRange = (booking, bookingId) => {
  const { startTime: parsedStart, endTime: parsedEnd } = getBookingTimeRange(
    booking.date,
    booking.slot,
  );
  const startTime =
    typeof booking.startTime === 'string'
      ? Date.parse(booking.startTime)
      : parsedStart;
  const endTime =
    typeof booking.endTime === 'string'
      ? Date.parse(booking.endTime)
      : parsedEnd;
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime <= startTime) {
    throw new Error(`Booking "${bookingId}" has invalid times.`);
  }
  return { startTime, endTime };
};

const hasActiveReservation = (booking, bookingId, now) => {
  if (
    booking.status !== 'CONFIRMED' &&
    booking.status !== 'IN_USE' &&
    booking.status !== 'active'
  ) {
    return false;
  }
  const { startTime, endTime } = getStoredBookingRange(booking, bookingId);
  if (booking.status === 'IN_USE') return now <= endTime;
  return now <= Math.min(endTime, startTime + CHECK_IN_GRACE_MS);
};

exports.checkInBooking = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bạn cần đăng nhập để check-in.');
  }
  const bookingId = request.data?.bookingId;
  if (typeof bookingId !== 'string' || bookingId.trim().length === 0) {
    throw new HttpsError('invalid-argument', INVALID_QR_MESSAGE);
  }

  const bookingRef = db.collection('bookings').doc(bookingId);
  const now = Date.now();
  try {
    await db.runTransaction(async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists) {
        throw new HttpsError('failed-precondition', INVALID_QR_MESSAGE);
      }
      const booking = bookingSnapshot.data();
      const mayCheckIn =
        booking.userId === request.auth.uid ||
        request.auth.token.scanner === true ||
        request.auth.token.admin === true;
      if (!mayCheckIn) {
        throw new HttpsError('permission-denied', 'Bạn không có quyền check-in booking này.');
      }
      if (booking.status !== 'CONFIRMED' && booking.status !== 'active') {
        throw new HttpsError('failed-precondition', INVALID_QR_MESSAGE);
      }
      const { startTime, endTime } = getStoredBookingRange(booking, bookingId);
      const checkInDeadline = Math.min(endTime, startTime + CHECK_IN_GRACE_MS);
      if (now < startTime - CHECK_IN_GRACE_MS || now > checkInDeadline) {
        throw new HttpsError('failed-precondition', INVALID_QR_MESSAGE);
      }
      if (typeof booking.roomId !== 'string') {
        throw new Error(`Booking "${bookingId}" has no roomId.`);
      }
      const roomRef = db.collection('rooms').doc(booking.roomId);
      const roomSnapshot = await transaction.get(roomRef);
      transaction.update(bookingRef, {
        status: 'IN_USE',
        checkedInAt: FieldValue.serverTimestamp(),
        qrInvalidatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (roomSnapshot.exists) {
        transaction.update(roomRef, { bookingRevision: FieldValue.increment(1) });
      }
    });
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(`Could not check in booking "${bookingId}".`, error);
    throw new HttpsError('internal', 'Không thể hoàn tất check-in. Vui lòng thử lại.');
  }
});

exports.extendBooking = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Bạn cần đăng nhập để gia hạn.');
  }
  const bookingId = request.data?.bookingId;
  const minutes = request.data?.minutes;
  if (
    typeof bookingId !== 'string' ||
    bookingId.trim().length === 0 ||
    !Number.isSafeInteger(minutes) ||
    minutes <= 0
  ) {
    throw new HttpsError('invalid-argument', 'Thời lượng gia hạn không hợp lệ.');
  }

  const bookingRef = db.collection('bookings').doc(bookingId);
  try {
    let extendedEndTime;
    await db.runTransaction(async (transaction) => {
      const bookingSnapshot = await transaction.get(bookingRef);
      if (!bookingSnapshot.exists) {
        throw new HttpsError('not-found', 'Booking không còn tồn tại.');
      }
      const booking = bookingSnapshot.data();
      if (booking.userId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Bạn chỉ có thể gia hạn booking của mình.');
      }
      if (booking.status !== 'IN_USE') {
        throw new HttpsError('failed-precondition', 'Chỉ có thể gia hạn khi đang sử dụng.');
      }
      const { endTime } = getStoredBookingRange(booking, bookingId);
      if (Date.now() > endTime) {
        throw new HttpsError('failed-precondition', 'Thời gian sử dụng đã kết thúc.');
      }
      if (typeof booking.roomId !== 'string') {
        throw new Error(`Booking "${bookingId}" has no roomId.`);
      }
      const extendedEnd = endTime + minutes * 60 * 1000;
      if (!Number.isFinite(extendedEnd)) {
        throw new HttpsError('invalid-argument', 'Thời lượng gia hạn không hợp lệ.');
      }

      const roomBookings = await transaction.get(
        db.collection('bookings').where('roomId', '==', booking.roomId),
      );
      const now = Date.now();
      const overlaps = roomBookings.docs.some((otherDocument) => {
        if (otherDocument.id === bookingId) return false;
        const otherBooking = otherDocument.data();
        if (!hasActiveReservation(otherBooking, otherDocument.id, now)) return false;
        const range = getStoredBookingRange(otherBooking, otherDocument.id);
        return range.startTime < extendedEnd && range.endTime > endTime;
      });
      if (overlaps) {
        throw new HttpsError(
          'failed-precondition',
          'Khung giờ tiếp theo đã có người đặt',
        );
      }

      const roomRef = db.collection('rooms').doc(booking.roomId);
      const roomSnapshot = await transaction.get(roomRef);
      extendedEndTime = new Date(extendedEnd).toISOString();
      transaction.update(bookingRef, {
        endTime: extendedEndTime,
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (roomSnapshot.exists) {
        transaction.update(roomRef, { bookingRevision: FieldValue.increment(1) });
      }
    });
    return { endTime: extendedEndTime };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(`Could not extend booking "${bookingId}".`, error);
    throw new HttpsError('internal', 'Không thể gia hạn booking. Vui lòng thử lại.');
  }
});

const processBookingLifecycle = async (now) => {
  const bookings = await db
    .collection('bookings')
    .where('status', 'in', ['CONFIRMED', 'IN_USE', 'active'])
    .get();

  for (const bookingDocument of bookings.docs) {
    const booking = bookingDocument.data();
    const { startTime, endTime } = getStoredBookingRange(
      booking,
      bookingDocument.id,
    );
    const becomesNoShow =
      (booking.status === 'CONFIRMED' || booking.status === 'active') &&
      now > startTime + CHECK_IN_GRACE_MS;
    const becomesCompleted = booking.status === 'IN_USE' && now >= endTime;
    if (!becomesNoShow && !becomesCompleted) continue;

    await db.runTransaction(async (transaction) => {
      const currentSnapshot = await transaction.get(bookingDocument.ref);
      if (!currentSnapshot.exists) return;
      const currentBooking = currentSnapshot.data();
      const isStillNoShowCandidate =
        (currentBooking.status === 'CONFIRMED' ||
          currentBooking.status === 'active') &&
        now > getStoredBookingRange(currentBooking, bookingDocument.id).startTime +
          CHECK_IN_GRACE_MS;
      const isStillCompletionCandidate =
        currentBooking.status === 'IN_USE' &&
        now >= getStoredBookingRange(currentBooking, bookingDocument.id).endTime;
      if (!isStillNoShowCandidate && !isStillCompletionCandidate) return;

      if (typeof currentBooking.roomId !== 'string') {
        throw new Error(`Booking "${bookingDocument.id}" has no roomId.`);
      }
      const roomRef = db.collection('rooms').doc(currentBooking.roomId);
      const roomSnapshot = await transaction.get(roomRef);
      transaction.update(bookingDocument.ref, {
        status: isStillNoShowCandidate ? 'NO_SHOW' : 'COMPLETED',
        ...(isStillNoShowCandidate
          ? { qrInvalidatedAt: FieldValue.serverTimestamp() }
          : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      if (roomSnapshot.exists) {
        transaction.update(roomRef, { bookingRevision: FieldValue.increment(1) });
      }
    });
  }
};

exports.createBookingReminderNotifications = onSchedule(
  {
    schedule: 'every 1 minutes',
    timeZone: TIME_ZONE,
    region: 'us-central1',
  },
  async () => {
    const now = Date.now();
    await processBookingLifecycle(now);
    const today = localDateKey(new Date(now));
    const bookings = await db
      .collection('bookings')
      .where('date', '==', today)
      .get();

    for (const bookingDocument of bookings.docs) {
      const booking = bookingDocument.data();
      if (!hasActiveReservation(booking, bookingDocument.id, now)) continue;

      const { startTime, endTime } = getStoredBookingRange(
        booking,
        bookingDocument.id,
      );
      const upcomingAt = startTime - 15 * 60 * 1000;
      const expiringAt = endTime - 10 * 60 * 1000;
      const isInNotificationWindow = (scheduledAt) =>
        scheduledAt <= now && scheduledAt > now - NOTIFICATION_WINDOW_MS;

      if (isInNotificationWindow(upcomingAt)) {
        await writeNotificationOnce({
          bookingId: bookingDocument.id,
          booking,
          type: 'UPCOMING',
          title: 'Sắp đến giờ đặt phòng',
          message: `Phòng ${booking.roomName} sẽ bắt đầu sau 15 phút (${booking.slot}).`,
        });
      }

      if (isInNotificationWindow(expiringAt)) {
        await writeNotificationOnce({
          bookingId: bookingDocument.id,
          booking,
          type: 'EXPIRING',
          title: 'Sắp hết giờ sử dụng phòng',
          message: `Thời gian sử dụng phòng ${booking.roomName} sẽ kết thúc sau 10 phút.`,
        });
      }
    }
  },
);
