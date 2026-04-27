// الإعدادات والمتغيرات
const API_URL = 'https://api.artic.edu/api/v1/artworks';
const SEARCH_API_URL = 'https://api.artic.edu/api/v1/artworks/search';
const IMAGE_BASE_URL = 'https://www.artic.edu/iiif/2';
const limit = 20; // جلب عدد أكبر لاحتمالية فلترة بعض اللوحات
const fields = 'id,title,image_id,artist_display,date_display,medium_display,subject_titles';

// كلمات محظورة لضمان أمان المحتوى للأطفال (NSFW) واستبعاد المنحوتات
const excludedKeywords = [
    // NSFW
    'nude', 'naked', 'bather', 'venus', 'aphrodite', 'erotic', 'prostitute', 'breast', 'brothel', 'sensual', 'bath', 'nymph',
    // Sculptures
    'sculpture', 'statue', 'bust'
];

/**
 * دالة للتحقق من أمان اللوحة ونوعها (Safe For Work & Not Sculpture)
 */
function isValidArtwork(artwork) {
    const title = (artwork.title || '').toLowerCase();
    const subjects = (artwork.subject_titles || []).join(' ').toLowerCase();
    const medium = (artwork.medium_display || '').toLowerCase();
    const textToCheck = `${title} ${subjects} ${medium}`;
    
    return !excludedKeywords.some(keyword => textToCheck.includes(keyword));
}

// حالة التطبيق (State)
let currentPage = 1;
let currentFilter = 'all';
let artworksData = [];
let isLoading = false;

// عناصر الـ DOM
const galleryGrid = document.getElementById('gallery');
const loader = document.getElementById('loader');
const loadMoreBtn = document.getElementById('load-more');
const filterButtons = document.querySelectorAll('.filter-btn');

// عناصر النافذة المنبثقة
const modal = document.getElementById('artwork-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalImage = document.getElementById('modal-image');
const modalTitle = document.getElementById('modal-title');
const modalArtist = document.getElementById('modal-artist');
const modalDate = document.getElementById('modal-date');
const modalMedium = document.getElementById('modal-medium');

/**
 * دالة لجلب البيانات من الـ API
 */
async function fetchArtworks(isNewSearch = false) {
    if (isLoading) return;
    isLoading = true;
    
    if (isNewSearch) {
        galleryGrid.innerHTML = '';
        artworksData = []; // إعادة تعيين البيانات
        loadMoreBtn.classList.add('hidden');
        loader.classList.remove('hidden');
    }

    try {
        let url;
        if (currentFilter === 'all') {
            url = `${API_URL}?page=${currentPage}&limit=${limit}&fields=${fields}`;
        } else {
            // استخدام البحث للفلترة بالتصنيف
            url = `${SEARCH_API_URL}?q=${currentFilter}&page=${currentPage}&limit=${limit}&fields=${fields}`;
        }

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data = await response.json();
        
        // استبعاد الأعمال التي لا تحتوي على صور أو المنحوتات أو المحتوى غير اللائق
        const validArtworks = data.data.filter(artwork => 
            artwork.image_id !== null && isValidArtwork(artwork)
        );
        
        // إذا استخدمنا نقطة البحث (search)، قد نحتاج للوصول للحقول بشكل مختلف أحياناً 
        // ولكن مع إضافة fields=... تعود بنفس الهيكل
        const startIndex = artworksData.length;
        artworksData = [...artworksData, ...validArtworks];
        
        renderGallery(validArtworks, startIndex);
        
        // إخفاء مؤشر التحميل وإظهار زر المزيد
        loader.classList.add('hidden');
        
        // إذا كان هناك بيانات راجعة، نظهر زر عرض المزيد
        if (data.data.length > 0) {
            loadMoreBtn.classList.remove('hidden');
        } else {
            loadMoreBtn.classList.add('hidden'); // لا يوجد المزيد
        }

    } catch (error) {
        console.error("خطأ في جلب البيانات:", error);
        loader.innerHTML = '<p style="color: #e74c3c; text-align:center;">عذراً، حدث خطأ. يرجى المحاولة لاحقاً.</p>';
    } finally {
        isLoading = false;
    }
}

/**
 * دالة لإنشاء عنصر العمل الفني
 */
function createArtworkItem(artwork, index) {
    const imageUrl = `${IMAGE_BASE_URL}/${artwork.image_id}/full/843,/0/default.jpg`;
    const artistName = artwork.artist_display ? artwork.artist_display.split('\n')[0] : 'فنان غير معروف';

    const item = document.createElement('div');
    item.className = 'artwork-item';

    item.innerHTML = `
        <div class="artwork-image-container">
            <img class="artwork-image" src="${imageUrl}" alt="${artwork.title}" loading="lazy">
        </div>
        <div class="artwork-info">
            <h3 class="artwork-title">${artwork.title || 'بدون عنوان'}</h3>
            <p class="artwork-artist">${artistName}</p>
        </div>
    `;

    item.addEventListener('click', () => openModal(index));
    return item;
}

/**
 * دالة لعرض اللوحات المجلوبة حديثاً
 */
function renderGallery(newArtworks, startIndex) {
    newArtworks.forEach((artwork, i) => {
        const item = createArtworkItem(artwork, startIndex + i);
        galleryGrid.appendChild(item);
    });
}

/**
 * التعامل مع الفلاتر
 */
filterButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        // إزالة الكلاس active من كل الأزرار
        filterButtons.forEach(b => b.classList.remove('active'));
        // إضافة الكلاس للزر المضغوط
        e.target.classList.add('active');

        // تحديث الحالة والبحث
        currentFilter = e.target.dataset.filter;
        currentPage = 1;
        fetchArtworks(true);
    });
});

/**
 * زر عرض المزيد
 */
loadMoreBtn.addEventListener('click', () => {
    currentPage++;
    loader.classList.remove('hidden');
    loadMoreBtn.classList.add('hidden');
    fetchArtworks(false);
});

/**
 * دوال النافذة المنبثقة (Modal)
 */
function openModal(index) {
    const artwork = artworksData[index];
    const highResImageUrl = `${IMAGE_BASE_URL}/${artwork.image_id}/full/1686,/0/default.jpg`;
    
    modalImage.src = highResImageUrl;
    modalImage.alt = artwork.title;
    modalTitle.textContent = artwork.title || 'بدون عنوان';
    modalArtist.textContent = artwork.artist_display || 'فنان غير معروف';
    modalDate.textContent = artwork.date_display || 'غير متوفر';
    modalMedium.textContent = artwork.medium_display || 'غير متوفر';
    
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.add('hidden');
    setTimeout(() => { modalImage.src = ''; }, 500);
    document.body.style.overflow = 'auto';
}

closeModalBtn.addEventListener('click', closeModal);

modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
        closeModal();
    }
});

// بدء التشغيل
document.addEventListener('DOMContentLoaded', () => {
    fetchArtworks(true);
});
