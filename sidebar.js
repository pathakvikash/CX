document.addEventListener('DOMContentLoaded', () => {
  const toggleButton = document.getElementById('toggleButton');
  const sidebar = document.getElementById('sidebar');

  toggleButton.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });
});
