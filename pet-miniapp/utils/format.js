function formatPrice(value) {
  return `¥${Number(value || 0).toFixed(0)}`;
}

function serviceDuration(minutes) {
  if (!minutes) {
    return '';
  }
  if (minutes >= 1440) {
    return `${Math.round(minutes / 1440)} 天`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? `${hours} 小时 ${rest} 分钟` : `${hours} 小时`;
  }
  return `${minutes} 分钟`;
}

module.exports = {
  formatPrice,
  serviceDuration
};
