/**
 * Helper functions for soft delete operations
 */

/**
 * Thêm điều kiện lọc tour chưa bị xóa vào query
 * @param {Object} query - Mongoose query object
 * @returns {Object} - Query object sau khi thêm điều kiện
 */
function excludeDeleted(query) {
    return query.where({ deletedAt: null });
}

/**
 * Thêm điều kiện lọc vào filter object
 * @param {Object} filter - Filter object
 * @returns {Object} - Filter object sau khi thêm điều kiện
 */
function excludeDeletedFromFilter(filter = {}) {
    return {
        ...filter,
        deletedAt: null
    };
}

module.exports = {
    excludeDeleted,
    excludeDeletedFromFilter
};

