// DOM Elements
const header = document.getElementById('header');
const hero = document.getElementById('hero');
const heroTitle = document.getElementById('hero-title');
const heroDescription = document.getElementById('hero-description');
const modal = document.getElementById('modal');
const modalClose = document.getElementById('modal-close');
const modalTitle = document.getElementById('modal-title');
const modalRating = document.getElementById('modal-rating');
const modalYear = document.getElementById('modal-year');
const modalAge = document.getElementById('modal-age');
const modalLength = document.getElementById('modal-length');
const modalGenre = document.getElementById('modal-genre');
const modalDescription = document.getElementById('modal-description');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');
const playBtn = document.getElementById('play-btn');
const moreInfoBtn = document.getElementById('more-info-btn');
const searchInput = document.getElementById('search-input');
const profileDropdown = document.getElementById('profile-dropdown');
const dropdownMenu = document.getElementById('dropdown-menu');
const signOut = document.getElementById('sign-out');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  renderAllRows();
  setupEventListeners();
  updateHero();
  updateMyList();
});

// Render Functions
function renderAllRows() {
  renderRow('trending-carousel', sampleContent.trending);
  renderRow('top-rated-carousel', sampleContent.topRated);
  renderRow('new-releases-carousel', sampleContent.newReleases);
  renderRow('continue-watching-carousel', sampleContent.continueWatching);
  renderRow('upcoming-carousel', sampleContent.upcoming);
  renderFeaturedRow('netflix-originals-carousel', sampleContent.onlyOnNetflix);
}

function renderRow(carouselId, items) {
  const carousel = document.getElementById(carouselId);
  carousel.innerHTML = '';
  items.forEach(item => {
    const card = createCard(item);
    carousel.appendChild(card);
  });
}

function renderFeaturedRow(carouselId, items) {
  const carousel = document.getElementById(carouselId);
  carousel.innerHTML = '';
  items.forEach(item => {
    const card = createFeaturedCard(item);
    carousel.appendChild(card);
  });
}

function createCard(item) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.id = item.id;

  const isInList = myList.some(listItem => listItem.id === item.id);
  const listIcon = isInList ? 'fa-check' : 'fa-plus';

  card.innerHTML = `
    <button class="list-toggle ${isInList ? 'active' : ''}" onclick="toggleMyList(${item.id}, event)">
      <i class="fas ${listIcon}"></i>
    </button>
    ${item.progress > 0 ? `<div class="progress-bar"><div class="progress-fill" style="width: ${item.progress}%"></div></div>` : ''}
    <img src="${item.image}" alt="${item.title}" onclick="openModal(${item.id})">
    <button class="play-button" onclick="openModal(${item.id})">
      <i class="fas fa-play"></i>
    </button>
    <div class="card-info">
      <h3 class="card-title">${item.title}</h3>
      <div class="card-meta">
        <span class="card-rating">${item.rating}%</span>
        <span class="card-year">${item.year}</span>
        <span class="card-season">${item.duration}</span>
      </div>
    </div>
  `;

  return card;
}

function createFeaturedCard(item) {
  const card = document.createElement('div');
  card.className = 'featured-card';
  card.dataset.id = item.id;

  const isInList = myList.some(listItem => listItem.id === item.id);
  const listIcon = isInList ? 'fa-check' : 'fa-plus';
  const tagClass = item.tag?.toLowerCase().includes('original') ? 'top' : '';

  card.innerHTML = `
    <img src="${item.image}" alt="${item.title}" class="featured-img" onclick="openModal(${item.id})">
    <div class="featured-content">
      ${item.tag ? `<span class="featured-tag ${tagClass}">${item.tag}</span>` : ''}
      <h3 class="featured-card-title">${item.title}</h3>
      <p class="featured-card-desc">${item.description || 'A Netflix Original production that you will love.'}</p>
      <div class="featured-meta">
        <div class="featured-meta-left">
          <span class="featured-rating">${item.rating}% Match</span>
          <span class="featured-age">${item.age}</span>
        </div>
        <span class="featured-length">${item.duration}</span>
      </div>
      <button class="btn btn-primary" onclick="openModal(${item.id})">
        <i class="fas fa-play"></i> Watch Now
      </button>
      <button class="btn btn-secondary" onclick="toggleMyList(${item.id}, event)">
        <i class="fas fa-${listIcon}"></i> My List
      </button>
    </div>
  `;

  return card;
}

// Event Listeners
function setupEventListeners() {
  // Header scroll effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  });

  // Modal close
  modalClose.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  // Play button
  playBtn.addEventListener('click', () => openModal(sampleContent.onlyOnNetflix[0].id));

  // More Info button
  moreInfoBtn.addEventListener('click', () => showModalInfo(sampleContent.onlyOnNetflix[0]));

  // Search
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase();
    if (query.length > 0) {
      const allContent = Object.values(sampleContent).flat();
      const results = allContent.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.genres.some(g => g.toLowerCase().includes(query))
      );
      showNotification(`${results.length} results found for "${query}"`);
    }
  });

  // Profile dropdown
  profileDropdown.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle('active');
  });

  document.addEventListener('click', () => dropdownMenu.classList.remove('active'));

  // Sign out
  signOut.addEventListener('click', () => showNotification('Signed out', 'success'));
}

// Modal Functions
function openModal(id) {
  const allContent = Object.values(sampleContent).flat();
  const item = allContent.find(i => i.id === id);
  if (item) {
    currentModalItem = item;
    showModalInfo(item);
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal() {
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function showModalInfo(item) {
  modalTitle.textContent = item.title;
  modalRating.textContent = `${item.rating || 'New'}% Match`;
  modalYear.textContent = item.year;
  modalAge.textContent = item.age;
  modalLength.textContent = item.duration;
  modalGenre.innerHTML = item.genres.map(g => `<span>${g}</span>`).join('');
  modalDescription.textContent = item.description || 'No description available.';
}

function toggleMyListFromModal() {
  if (currentModalItem) toggleMyList(currentModalItem.id, event);
}

// My List Functions
function toggleMyList(id, event) {
  if (event) event.stopPropagation();
  const allContent = Object.values(sampleContent).flat();
  const item = allContent.find(i => i.id === id);
  if (!item) return;

  const index = myList.findIndex(listItem => listItem.id === id);
  if (index > -1) {
    myList.splice(index, 1);
    showNotification('Removed from My List', 'error');
  } else {
    myList.push(item);
    showNotification('Added to My List', 'success');
  }

  updateMyList();
  updateAllCards();
}

function updateMyList() {
  localStorage.setItem('myList', JSON.stringify(myList));
}

function updateAllCards() {
  document.querySelectorAll('.card, .featured-card').forEach(card => {
    const id = parseInt(card.dataset.id);
    const isInList = myList.some(item => item.id === id);
    const listToggle = card.querySelector('.list-toggle');
    if (listToggle) {
      listToggle.classList.toggle('active', isInList);
      listToggle.innerHTML = `<i class="fas ${isInList ? 'fa-check' : 'fa-plus'}"></i>`;
    }
  });
}

// Hero Auto-Rotate
function updateHero() {
  const featuredItems = sampleContent.onlyOnNetflix;
  let currentIndex = 0;

  setInterval(() => {
    currentIndex = (currentIndex + 1) % featuredItems.length;
    const item = featuredItems[currentIndex];
    heroTitle.textContent = item.title;
    heroDescription.textContent = item.description || 'A Netflix Original production.';
    hero.style.backgroundImage = `linear-gradient(to bottom, rgba(0, 0, 0, 0.4), rgba(20, 20, 20, 0.8)), url('${item.image}')`;
  }, 8000);
}

// Utility
function scrollRow(carouselId, scrollAmount) {
  const carousel = document.getElementById(carouselId);
  carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' });
}

function showNotification(message, type = '') {
  notificationText.textContent = message;
  notification.className = `notification ${type} active`;
  setTimeout(() => notification.classList.remove('active'), 3000);
}

// Touch Support
document.querySelectorAll('.row-carousel').forEach(carousel => {
  let touchStartX = 0;
  carousel.addEventListener('touchstart', (e) => { touchStartX = e.changedTouches[0].screenX; }, { passive: true });
  carousel.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 50) carousel.scrollBy({ left: diff > 0 ? 300 : -300, behavior: 'smooth' });
  }, { passive: true });
});