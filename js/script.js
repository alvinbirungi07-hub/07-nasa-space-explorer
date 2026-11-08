// Find the page elements we need to connect to the NASA API.
const startInput = document.getElementById('startDate');
const endInput = document.getElementById('endDate');
const getImagesButton = document.getElementById('getImagesButton');
const gallery = document.getElementById('gallery');
const spaceFact = document.getElementById('spaceFact');
const imageModal = document.getElementById('imageModal');
const closeModalButton = document.getElementById('closeModalButton');
const modalImage = document.getElementById('modalImage');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

const apiUrl = 'https://api.nasa.gov/planetary/apod';
const apiKey = 'KcbfCJtPpFCH8qdJRcJFg87qTD6p9PkrzWdL6NLt';

const spaceFacts = [
	'A day on Venus is longer than a year on Venus.',
	'The footprints left on the Moon could stay there for millions of years.',
	'Jupiter is so large that more than 1,300 Earths could fit inside it.',
	'A neutron star can spin hundreds of times every second.',
	'Light from the Sun takes about eight minutes to reach Earth.'
];

// Pick a new fact whenever the page loads.
spaceFact.textContent = spaceFacts[Math.floor(Math.random() * spaceFacts.length)];

// Call the setupDateInputs function from dateRange.js
// This sets up the date pickers to:
// - Default to a range of 9 days (from 9 days ago to today)
// - Restrict dates to NASA's image archive (starting from 1995)
setupDateInputs(startInput, endInput);

async function getSpaceImages() {
	const startDate = startInput.value;
	const endDate = endInput.value;

	if (!startDate || !endDate) {
		gallery.innerHTML = '<p class="status-message">Please choose a start and end date.</p>';
		return;
	}
	if (startDate > endDate) {
		gallery.innerHTML = '<p class="status-message error-message">The start date must be before the end date.</p>';
		return;
	}

	const cacheKey = `apod-${startDate}-${endDate}`;
	const savedPhotos = localStorage.getItem(cacheKey);
	if (savedPhotos) {
		const cachedPhotos = JSON.parse(savedPhotos);
		if (hasUsablePhotos(cachedPhotos)) {
			displayGallery(cachedPhotos);
			return;
		}
		localStorage.removeItem(cacheKey);
	}

	gallery.innerHTML = '<p class="status-message">Loading space photos...</p>';
	getImagesButton.disabled = true;

	try {
		const requestUrl = new URL(apiUrl);
		requestUrl.search = new URLSearchParams({
			api_key: apiKey,
			start_date: startDate,
			end_date: endDate
		});
		const response = await fetch(requestUrl);

		if (!response.ok) {
			if (response.status === 429) {
				throw new Error('NASA has reached the DEMO_KEY request limit. Wait an hour or use a personal NASA API key.');
			}
			let errorMessage = `NASA returned an error (${response.status}).`;
			try {
				const errorData = await response.json();
				if (errorData.msg) {
					errorMessage = errorData.msg;
				}
			} catch (error) {
				// Use the status message when NASA does not return JSON.
			}
			throw new Error(errorMessage);
		}

		const spacePhotos = await response.json();
		if (hasUsablePhotos(spacePhotos)) {
			localStorage.setItem(cacheKey, JSON.stringify(spacePhotos));
		}
		displayGallery(spacePhotos);
	} catch (error) {
		gallery.innerHTML = `<p class="status-message error-message">${error.message} Please try again.</p>`;
	} finally {
		getImagesButton.disabled = false;
	}
}

function displayGallery(spacePhotos) {
	gallery.innerHTML = '';
	const photos = (Array.isArray(spacePhotos) ? spacePhotos : [spacePhotos])
		.filter((photo) => photo && !isNASAPlaceholder(photo));

	if (!photos.length) {
		gallery.innerHTML = '<p class="status-message">NASA returned a temporary placeholder instead of space photos. Please try again later.</p>';
		return;
	}

	photos.sort((firstPhoto, secondPhoto) => firstPhoto.date.localeCompare(secondPhoto.date));

	photos.forEach((photo) => {
		const galleryItem = document.createElement('article');
		galleryItem.className = 'gallery-item';

		if (photo.media_type === 'image') {
			galleryItem.innerHTML = `
				<button class="photo-button" type="button" aria-label="View details for ${photo.title}">
					<img src="${photo.hdurl || photo.url}" alt="${photo.title}" />
				</button>
				<div class="gallery-copy">
					<h2>${photo.title}</h2>
					<p class="photo-date">${photo.date}</p>
				</div>`;
			const image = galleryItem.querySelector('img');
			image.addEventListener('error', () => {
				if (image.src !== photo.url) {
					image.src = photo.url;
				}
			});
			galleryItem.querySelector('.photo-button').addEventListener('click', () => openModal(photo));
		} else {
			galleryItem.innerHTML = `
				<div class="video-preview">VIDEO</div>
				<div class="gallery-copy">
					<h2>${photo.title}</h2>
					<p class="photo-date">${photo.date}</p>
					<a class="video-link" href="${photo.url}" target="_blank" rel="noopener">Watch this NASA video</a>
				</div>`;
		}

		gallery.appendChild(galleryItem);
	});
}

function isNASAPlaceholder(photo) {
	const imageUrl = photo.url || photo.hdurl || '';
	return photo.title === 'NASA Science' && imageUrl.includes('nasa-logo');
}

function hasUsablePhotos(spacePhotos) {
	const photos = Array.isArray(spacePhotos) ? spacePhotos : [spacePhotos];
	return photos.some((photo) => photo && !isNASAPlaceholder(photo));
}

function openModal(photo) {
	modalImage.src = photo.hdurl || photo.url;
	modalImage.alt = photo.title;
	modalTitle.textContent = photo.title;
	modalDate.textContent = photo.date;
	modalExplanation.textContent = photo.explanation;
	imageModal.classList.add('is-open');
	imageModal.setAttribute('aria-hidden', 'false');
	closeModalButton.focus();
}

function closeModal() {
	imageModal.classList.remove('is-open');
	imageModal.setAttribute('aria-hidden', 'true');
	modalImage.src = '';
}

getImagesButton.addEventListener('click', getSpaceImages);
closeModalButton.addEventListener('click', closeModal);
imageModal.addEventListener('click', (event) => {
	if (event.target === imageModal) {
		closeModal();
	}
});
document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && imageModal.classList.contains('is-open')) {
		closeModal();
	}
});
