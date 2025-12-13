import React from 'react';

const BookingDetailModal = ({ booking, onClose }) => {
  if (!booking) return null;

  const formatDate = (date) => new Date(date).toLocaleDateString('vi-VN');
  const ext = booking.extension || {};

  // Lấy số ngày của tour một cách an toàn (hỗ trợ cả trường hợp lưu dạng chuỗi)
  const baseDuration = (() => {
    const d = booking?.tour?.duration;
    if (typeof d === 'number' && !Number.isNaN(d)) return d;
    if (typeof d === 'string') {
      const m = d.match(/[0-9]+/);
      if (m) return parseInt(m[0], 10);
    }
    return null;
  })();

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={{ margin: 0 }}>Chi tiết đơn đặt</h3>
          <button style={styles.closeBtn} onClick={onClose}>✖</button>
        </div>

        <div style={styles.section}>
          <h4 style={styles.title}>{booking.tour?.name || 'Tour đã bị xóa'}</h4>
          <div style={styles.grid}>
            <div style={styles.row}><span>Ngày khởi hành:</span><strong>{formatDate(booking.startDate)}</strong></div>
            {(() => {
              const addDays = Number(ext?.additionalDays) || 0;
              const hasBase = baseDuration !== null;
              const total = hasBase ? baseDuration + addDays : null;
              return (
                <div style={styles.row}>
                  <span>Thời gian:</span>
                  <strong>
                    {total !== null ? `${total} ngày` : '—'}
                    {addDays > 0 && (
                      hasBase ? ` (${baseDuration} + ${addDays})` : ` (+${addDays})`
                    )}
                  </strong>
                </div>
              );
            })()}
            <div style={styles.row}><span>Số người:</span><strong>{booking.numberOfPeople}{ext?.additionalPeople > 0 && ext?.extensionStatus === 'pending' ? ` (+${ext.additionalPeople})` : ''}</strong></div>
            <div style={styles.row}>
              <span>Tổng tiền:</span>
              {(() => {
                const ext = booking.extension || {};
                const finalPrice = typeof booking.finalPrice === 'number'
                  ? booking.finalPrice
                  : (ext.extensionStatus === 'approved'
                      ? (ext.totalPrice || (booking.price + (ext.extensionPrice || 0)))
                      : booking.price);
                return <strong>{finalPrice.toLocaleString()} VND</strong>;
              })()}
            </div>
            <div style={styles.row}><span>Trạng thái đơn:</span><strong>{booking.status === 'confirmed' ? 'Đã xác nhận' : booking.status === 'pending' ? 'Đang chờ xác nhận' : booking.status === 'completed' ? 'Đã hoàn thành' : booking.status === 'cancelled' ? 'Đã hủy' : booking.status}</strong></div>
            <div style={styles.row}><span>Thanh toán:</span><strong style={{ color: booking.paid ? '#27ae60' : '#e74c3c' }}>{booking.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}</strong></div>
            <div style={styles.row}><span>Ngày đặt:</span><strong>{formatDate(booking.createdAt)}</strong></div>
            <div style={styles.row}><span>Mã đơn:</span><code>{booking._id}</code></div>
          </div>
        </div>

        {ext && ext.extensionStatus && ext.extensionStatus !== 'none' && (
          <div style={styles.section}>
            <h4 style={styles.subtitle}>Mở rộng</h4>
            <div style={styles.grid}>
              <div style={styles.row}><span>Trạng thái:</span><strong style={{ color: ext.extensionStatus === 'approved' ? 'green' : ext.extensionStatus === 'pending' ? 'orange' : 'red' }}>
                {ext.extensionStatus === 'approved' ? 'Đã phê duyệt' : ext.extensionStatus === 'pending' ? 'Đang chờ duyệt' : 'Bị từ chối'}
              </strong></div>
              <div style={styles.row}><span>Thêm ngày:</span><strong>+{ext.additionalDays || 0}</strong></div>
              <div style={styles.row}><span>Thêm người:</span><strong>+{ext.additionalPeople || 0}</strong></div>
              {ext.extensionPrice > 0 && (
                <>
                  <div style={styles.row}><span>Phụ thu:</span><strong>{ext.extensionPrice.toLocaleString()} VND</strong></div>
                  {ext.totalPrice && (
                    <div style={styles.row}><span>Tổng dự kiến:</span><strong>{ext.totalPrice.toLocaleString()} VND</strong></div>
                  )}
                </>
              )}
              {ext.requestedAt && (
                <div style={styles.row}><span>Ngày yêu cầu:</span><strong>{formatDate(ext.requestedAt)}</strong></div>
              )}
            </div>
          </div>
        )}

        <div style={styles.footer}>
          <button className="btn btn-secondary" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: {
    width: '640px', maxWidth: '95vw', background: '#fff', borderRadius: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #eee'
  },
  closeBtn: {
    border: 'none', background: 'transparent', fontSize: '18px', cursor: 'pointer'
  },
  section: {
    padding: '12px 16px'
  },
  title: { margin: 0 },
  subtitle: { margin: '0 0 4px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', marginTop: '8px' },
  row: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  footer: { padding: '12px 16px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'flex-end' }
};

export default BookingDetailModal;

