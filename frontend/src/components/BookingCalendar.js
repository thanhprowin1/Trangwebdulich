import React, { useState, useEffect } from 'react';
import '../styles/BookingCalendar.css';

const BookingCalendar = ({ availableDates, selectedDate, onDateChange }) => {
  // Khởi tạo tháng hiện tại hoặc tháng của ngày đã chọn
  const getInitialMonth = () => {
    if (selectedDate) {
      const selected = new Date(selectedDate);
      return selected.getMonth();
    }
    return new Date().getMonth();
  };

  const getInitialYear = () => {
    if (selectedDate) {
      const selected = new Date(selectedDate);
      return selected.getFullYear();
    }
    return new Date().getFullYear();
  };

  const [currentMonth, setCurrentMonth] = useState(getInitialMonth());
  const [currentYear, setCurrentYear] = useState(getInitialYear());

  // Cập nhật tháng hiện tại khi selectedDate thay đổi
  React.useEffect(() => {
    if (selectedDate) {
      const selected = new Date(selectedDate);
      setCurrentMonth(selected.getMonth());
      setCurrentYear(selected.getFullYear());
    }
  }, [selectedDate]);

  // Tên tháng tiếng Việt
  const monthNames = [
    'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
    'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12'
  ];

  // Tên thứ tiếng Việt
  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  // Lấy danh sách Date objects của các ngày có tour
  const getAvailableDateObjects = () => {
    if (!availableDates || availableDates.length === 0) return [];
    return availableDates.map(d => {
      const date = new Date(d.value || d);
      date.setHours(0, 0, 0, 0);
      return date;
    });
  };

  const availableDateObjects = getAvailableDateObjects();

  // Kiểm tra một ngày có phải là ngày có tour không
  const isAvailableDate = (date) => {
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    
    return availableDateObjects.some(availableDate => {
      const availableDateStr = availableDate.toISOString().split('T')[0];
      const checkDateStr = dateToCheck.toISOString().split('T')[0];
      return availableDateStr === checkDateStr;
    });
  };

  // Kiểm tra ngày có phải là ngày trong quá khứ không
  const isPastDate = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Kiểm tra ngày có được chọn không
  const isSelectedDate = (date) => {
    if (!selectedDate) return false;
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return selected.getTime() === checkDate.getTime();
  };

  // Lấy số ngày trong tháng
  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Lấy ngày đầu tiên của tháng là thứ mấy
  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  // Chuyển tháng trước
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  // Chuyển tháng sau
  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Xử lý khi click vào ngày
  const handleDateClick = (day) => {
    const date = new Date(currentYear, currentMonth, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Chỉ cho phép chọn ngày không phải quá khứ và có tour
    if (!isPastDate(date) && isAvailableDate(date)) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const dayStr = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      onDateChange(dateStr);
    }
  };

  // Render các ngày trong tháng
  const renderDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];

    // Thêm các ô trống cho ngày đầu tháng
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Thêm các ngày trong tháng
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const past = isPastDate(date);
      const available = isAvailableDate(date);
      const selected = isSelectedDate(date);
      const clickable = !past && available;

      let dayClass = 'calendar-day';
      if (past) {
        dayClass += ' past';
      } else if (selected) {
        dayClass += ' selected';
      } else if (available) {
        dayClass += ' available';
      } else {
        dayClass += ' unavailable';
      }

      days.push(
        <div
          key={day}
          className={dayClass}
          onClick={() => clickable && handleDateClick(day)}
          style={{ cursor: clickable ? 'pointer' : 'not-allowed' }}
        >
          {day}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="booking-calendar">
      <div className="calendar-header">
        <button 
          type="button" 
          className="calendar-nav-btn" 
          onClick={handlePrevMonth}
          aria-label="Tháng trước"
        >
          ‹
        </button>
        <div className="calendar-month-year">
          {monthNames[currentMonth]} {currentYear}
        </div>
        <button 
          type="button" 
          className="calendar-nav-btn" 
          onClick={handleNextMonth}
          aria-label="Tháng sau"
        >
          ›
        </button>
      </div>
      
      <div className="calendar-weekdays">
        {weekDays.map((day, index) => (
          <div key={index} className="calendar-weekday">
            {day}
          </div>
        ))}
      </div>
      
      <div className="calendar-days">
        {renderDays()}
      </div>
    </div>
  );
};

export default BookingCalendar;

