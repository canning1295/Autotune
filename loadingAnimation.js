export function showLoadingAnimation() {
    // Create the overlay
    const overlay = document.createElement('div');
    overlay.classList.add('overlay');
    document.body.appendChild(overlay);
  
    // Create the loading container
    const loadingContainer = document.createElement('div');
    loadingContainer.id = 'loading-container';
    loadingContainer.className = 'center';
    const waveCount = 10;
    for (let i = 0; i < waveCount; i++) {
      const wave = document.createElement('div');
      wave.className = 'wave';
      wave.style.animationDelay = `${i / waveCount}s`;
      loadingContainer.appendChild(wave);
    }
  
    // Add the loading container to the overlay
    overlay.appendChild(loadingContainer);
  }
  

  export function hideLoadingAnimation() {
    // Remove the loading container from the overlay
    const loadingContainer = document.getElementById('loading-container');
    loadingContainer.parentNode.removeChild(loadingContainer);
  
    // Remove the overlay from the document body
    const overlay = document.querySelector('.overlay');
    overlay.parentNode.removeChild(overlay);
  }
  
  
  