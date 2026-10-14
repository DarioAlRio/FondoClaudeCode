// Busca con el motor predeterminado de Chrome; si no está disponible, usa Google
document.getElementById('buscar').addEventListener('submit', e => {
  e.preventDefault();
  const text = document.getElementById('q').value.trim();
  if (!text) return;
  const google = () => { location.href = 'https://www.google.com/search?q=' + encodeURIComponent(text); };
  try {
    if (chrome.search && chrome.search.query) {
      chrome.search.query({ text, disposition: 'CURRENT_TAB' }).catch(google);
    } else {
      google();
    }
  } catch (err) {
    google();
  }
});
