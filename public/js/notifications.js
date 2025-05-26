// Notification system

const notificationContainer = document.getElementById('notification-container');

/**
 * Show a notification message
 * @param {string} message - The message to display
 * @param {string} type - The notification type: 'success', 'error', or 'info'
 * @param {number} duration - Duration in milliseconds, default is 3000ms
 */
function showNotification(message, type = 'info', duration = 3000) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  // Set icon based on type
  let icon;
  switch(type) {
    case 'success':
      icon = 'fas fa-check-circle';
      break;
    case 'error':
      icon = 'fas fa-exclamation-circle';
      break;
    default:
      icon = 'fas fa-info-circle';
  }
  
  // Set notification content
  notification.innerHTML = `
    <i class="${icon}"></i>
    <p>${message}</p>
  `;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Animate notification
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  // Remove notification after duration
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300); // Wait for fade out animation
  }, duration);
  
  return notification;
}

export { showNotification };