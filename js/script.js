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
const imageLibraryUrl = 'https://images-api.nasa.gov/search';
const apiKey = 'KcbfCJtPpFCH8qdJRcJFg87qTD6p9PkrzWdL6NLt';

// NASA's APOD service is currently returning its logo for some requests.
// These NASA-hosted images keep the gallery useful while that is happening.
const fallbackPhotos = [
	{
		title: 'Weighing in on the Dumbbell Nebula',
		hdurl: 'https://images-assets.nasa.gov/image/PIA14417/PIA14417~medium.jpg',
		explanation: 'The Dumbbell Nebula, also known as Messier 27, is the remains of a star that once looked a lot like our Sun.',
		media_type: 'image'
	},
	{
		title: 'Ant Nebula',
		hdurl: 'https://images-assets.nasa.gov/image/PIA04216/PIA04216~small.jpg',
		explanation: 'NASA Hubble captured this celestial object called the Ant Nebula, which may help scientists understand the future of stars like our Sun.',
		media_type: 'image'
	},
	{
		title: 'Planetary Nebula',
		hdurl: 'https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e001465/GSFC_20171208_Archive_e001465~small.jpg',
		explanation: 'This colorful cloud of gas was shed by a dying central star and is known as the Ring Nebula.',
		media_type: 'image'
	},
];

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
		if (!hasUsablePhotos(spacePhotos)) {
			displayGallery(await getNASAImageLibraryPhotos(startDate, endDate));
			return;
		}
		if (hasUsablePhotos(spacePhotos)) {
			localStorage.setItem(cacheKey, JSON.stringify(spacePhotos));
		}
		displayGallery(spacePhotos);
	} catch (error) {
		displayGallery(await getNASAImageLibraryPhotos(startDate, endDate));
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
			galleryItem.addEventListener('click', () => openModal(photo));
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

function createFallbackPhotos(startDate) {
	const startNumber = [...startDate].reduce((total, character) => total + character.charCodeAt(0), 0);
	const selectedPhotos = fallbackPhotos.map((photo, index) => fallbackPhotos[(index + startNumber) % fallbackPhotos.length]).slice(0, 3);

	return selectedPhotos.map((photo, index) => ({
		...photo,
		date: getFallbackDate(startDate, index),
		url: photo.hdurl
	}));
}

async function getNASAImageLibraryPhotos(startDate, endDate) {
	try {
		const startNumber = [...startDate].reduce((total, character) => total + character.charCodeAt(0), 0);
		const requestUrl = new URL(imageLibraryUrl);
		requestUrl.search = new URLSearchParams({
			q: 'nebula',
			media_type: 'image',
			page_size: '6',
			page: String((startNumber % 5) + 1),
			year_start: startDate.slice(0, 4),
			year_end: endDate.slice(0, 4)
		});
		let response = await fetch(requestUrl);
		if (!response.ok) {
			throw new Error('NASA image archive unavailable');
		}

		let result = await response.json();
		if (!result.collection.items.length) {
			requestUrl.searchParams.delete('year_start');
			requestUrl.searchParams.delete('year_end');
			response = await fetch(requestUrl);
			result = await response.json();
		}

		const photos = result.collection.items
			.filter((item) => item.data && item.data[0] && item.links && item.links[0])
			.slice(0, 3)
			.map((item) => ({
				title: item.data[0].title,
				date: item.data[0].date_created.split('T')[0],
				explanation: item.data[0].description || 'NASA image archive photo.',
				media_type: 'image',
				hdurl: item.links[0].href,
				url: item.links[0].href
			}));

		return photos.length ? photos : createFallbackPhotos(startDate);
	} catch (error) {
		return createFallbackPhotos(startDate);
	}
}

function getFallbackDate(startDate, daysAfterStart) {
	const date = new Date(`${startDate}T00:00:00`);
	date.setDate(date.getDate() + daysAfterStart);
	return date.toISOString().split('T')[0];
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
