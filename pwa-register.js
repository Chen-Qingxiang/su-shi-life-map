if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {scope:'./',updateViaCache:'none'})
      .catch(err => console.warn('PWA offline support unavailable:',err));
  });
}
