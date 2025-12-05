import React from 'react';
import { useHistory, useLocation } from 'react-router-dom';

const Pagination = ({ currentPage, totalPages, totalResults }) => {
  const history = useHistory();
  const location = useLocation();

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;

    const params = new URLSearchParams(location.search);
    params.set('page', page);
    history.push(`${location.pathname}?${params.toString()}`);
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;

    if (totalPages <= maxVisiblePages) {
      // Hiển thị tất cả các trang nếu ít hơn hoặc bằng maxVisiblePages
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic hiển thị thông minh khi có nhiều trang
      if (currentPage <= 3) {
        // Ở đầu: 1 2 3 4 ... last
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Ở cuối: 1 ... last-3 last-2 last-1 last
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        // Ở giữa: 1 ... current-1 current current+1 ... last
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages.map((page, index) => {
      if (page === '...') {
        return (
          <span key={`ellipsis-${index}`} className="pagination-ellipsis">
            ...
          </span>
        );
      }

      return (
        <button
          key={page}
          className={`pagination-button ${currentPage === page ? 'active' : ''}`}
          onClick={() => handlePageChange(page)}
          disabled={currentPage === page}
        >
          {page}
        </button>
      );
    });
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Hiển thị trang {currentPage} / {totalPages} ({totalResults} kết quả)
      </div>

      <div className="pagination">
        <button
          className="pagination-button pagination-prev"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Trang trước"
        >
          ‹ Trước
        </button>

        {renderPageNumbers()}

        <button
          className="pagination-button pagination-next"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Trang sau"
        >
          Sau ›
        </button>
      </div>
    </div>
  );
};

export default Pagination;

