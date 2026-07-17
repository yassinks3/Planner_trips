/**
 * Chérie Diary - Shared Dashboard Application Script
 * Features:
 * - Supabase sync logic (Storage & DB)
 * - Canvas Butterfly Particle Engine
 * - LocalStorage fallback with smart image compression
 * - Interactive Tab layout slider animations
 * - Bucket list & Timeline scheduler
 */

// --- Global Application State ---
const AppState = {
  supabase: null,
  isSupabaseConfigured: false,
  memories: [],
  bucketList: [],
  itinerary: [],
  activeTab: 'our-day'
};

// --- Mock Data Constants (Initial Setup) ---
const MOCK_MEMORIES = [
  {
    id: 'mock-1',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(), // 1 day ago
    text_content: "🌸 Late afternoon picnic in the rose garden. The cherry blossom tea was so sweet, and the strawberry crepes were absolute heaven! Let's do this every weekend.",
    image_url: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 'mock-2',
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
    text_content: "🧸 Found this cute vintage boutique downtown! Everything was in dusty rose shades. We bought matching gold bow hair ribbons.",
    image_url: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&q=80&w=800"
  },
  {
    id: 'mock-3',
    created_at: new Date().toISOString(), // Today
    text_content: "🍰 A warm diary note: Grateful for quiet moments, soft aesthetics, and laughter that echoes. Today was filled with golden light and pink skies.",
    image_url: "" // Diary entry with text only
  }
];

const MOCK_BUCKET_ITEMS = [
  { id: 'b-1', text: '🌷 Rent cute pastel bikes and ride along the beach path', completed: true },
  { id: 'b-2', text: '🍓 Go strawberry picking at the organic farm', completed: false },
  { id: 'b-3', text: '🍰 Bake a triple-layer strawberry cake with pink frosting', completed: false },
  { id: 'b-4', text: '🏰 Visit the magical fairy castle at sunset', completed: false }
];

const MOCK_ITINERARY_ITEMS = [
  { id: 'i-1', day: 'Day 1 (Arrival)', time: '02:00 PM', activity: '🎀 Check-in to our cozy rose-themed villa' },
  { id: 'i-2', day: 'Day 1 (Arrival)', time: '06:30 PM', activity: '🍝 Evening pasta dinner & sunset cocktail bar' },
  { id: 'i-3', day: 'Day 2 (Adventure)', time: '10:00 AM', activity: '🎨 Floral painting workshop under the glass pavilion' },
  { id: 'i-4', day: 'Day 2 (Adventure)', time: '03:00 PM', activity: '🍵 High tea service with rose macarons' }
];

// --- Initialize App ---
document.addEventListener('DOMContentLoaded', () => {
  initButterflyEngine();
  loadSupabaseCredentials();
  initTabSlider();
  bindUIEvents();
  loadData();
  
  // Set window resize handler for Tab slider offset recalculation
  window.addEventListener('resize', updateTabSliderPosition);
});

// --- Tab Slider Navigation Logic ---
function initTabSlider() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabTarget = tab.dataset.tab;
      AppState.activeTab = tabTarget;
      
      // Update Tab Pane visibility
      document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
      });
      document.getElementById(tabTarget).classList.add('active');
      
      updateTabSliderPosition();
    });
  });
  
  // Initial draw of slider position
  setTimeout(updateTabSliderPosition, 100);
}

function updateTabSliderPosition() {
  const activeTab = document.querySelector('.tab-btn.active');
  const sliderBg = document.querySelector('.tab-slider-bg');
  if (activeTab && sliderBg) {
    sliderBg.style.left = `${activeTab.offsetLeft}px`;
    sliderBg.style.width = `${activeTab.offsetWidth}px`;
  }
}

// --- Supabase Integration Setup ---
function loadSupabaseCredentials() {
  let url = localStorage.getItem('supabase_url') || 'https://sfiaacyamsqhlclkioui.supabase.co';
  let key = localStorage.getItem('supabase_key') || 'sb_publishable_qfRneQeqsmK4eqb35gN2Gg_Ejq7rSy-';
  const statusEl = document.getElementById('supabaseStatus');
  
  if (url && key) {
    try {
      // Clean url if it contains trailing slashes or rest endpoints
      let cleanUrl = url.trim();
      if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);
      if (cleanUrl.endsWith('/rest/v1')) cleanUrl = cleanUrl.slice(0, -8);
      if (cleanUrl.endsWith('/')) cleanUrl = cleanUrl.slice(0, -1);

      // Connect client
      AppState.supabase = supabase.createClient(cleanUrl, key);
      AppState.isSupabaseConfigured = true;
      
      // Update UI Status Indicators
      statusEl.classList.remove('offline');
      statusEl.classList.add('online');
      statusEl.querySelector('.status-text').textContent = 'Cloud Connected';
      statusEl.title = 'Connected to Supabase. Realtime synchronization enabled!';
      
      // Fill values into form inputs in settings modal
      document.getElementById('supabaseUrl').value = cleanUrl;
      document.getElementById('supabaseKey').value = key;
    } catch (error) {
      console.error("Supabase config error, reverting to local fallback:", error);
      setupLocalFallback();
    }
  } else {
    setupLocalFallback();
  }
}

function setupLocalFallback() {
  AppState.isSupabaseConfigured = false;
  AppState.supabase = null;
  const statusEl = document.getElementById('supabaseStatus');
  statusEl.classList.remove('online');
  statusEl.classList.add('offline');
  statusEl.querySelector('.status-text').textContent = 'Local Mode';
  statusEl.title = 'Supabase unconfigured. Data is stored safely on this browser.';
}

// --- Data Fetching and Local Fallbacks ---
async function loadData() {
  // 1. Load memories
  if (AppState.isSupabaseConfigured) {
    try {
      const { data, error } = await AppState.supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      AppState.memories = data || [];
    } catch (e) {
      console.error("Supabase fetch posts error, reading local:", e);
      loadMemoriesFromLocal();
    }
  } else {
    loadMemoriesFromLocal();
  }
  renderMemories();

  // 2. Load bucket list
  loadBucketList();
  renderBucketList();

  // 3. Load itinerary
  loadItinerary();
  renderItinerary();
}

function loadMemoriesFromLocal() {
  const stored = localStorage.getItem('cherie_posts');
  if (stored) {
    AppState.memories = JSON.parse(stored);
  } else {
    AppState.memories = [...MOCK_MEMORIES];
    localStorage.setItem('cherie_posts', JSON.stringify(AppState.memories));
  }
}

function loadBucketList() {
  const stored = localStorage.getItem('cherie_bucket');
  if (stored) {
    AppState.bucketList = JSON.parse(stored);
  } else {
    AppState.bucketList = [...MOCK_BUCKET_ITEMS];
    localStorage.setItem('cherie_bucket', JSON.stringify(AppState.bucketList));
  }
}

function loadItinerary() {
  const stored = localStorage.getItem('cherie_itinerary');
  if (stored) {
    AppState.itinerary = JSON.parse(stored);
  } else {
    AppState.itinerary = [...MOCK_ITINERARY_ITEMS];
    localStorage.setItem('cherie_itinerary', JSON.stringify(AppState.itinerary));
  }
}

// --- Rendering Logic ---

// Memory scrapbook grid render
function renderMemories() {
  const grid = document.getElementById('memoriesGrid');
  const emptyState = document.getElementById('noMemoriesState');
  grid.innerHTML = '';
  
  if (AppState.memories.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  
  AppState.memories.forEach((post) => {
    const card = document.createElement('article');
    card.className = 'memory-card';
    
    // Process creation date
    const dateObj = new Date(post.created_at);
    const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeFormatted = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Construct Image Wrapper if URL exists
    let imgHTML = '';
    if (post.image_url) {
      imgHTML = `
        <div class="memory-img-wrapper">
          <img src="${post.image_url}" alt="Memory image" class="memory-img" loading="lazy">
        </div>
      `;
    }
    
    card.innerHTML = `
      ${imgHTML}
      <span class="date-sticker">🌸 ${dateFormatted}</span>
      <div class="memory-body">
        <p class="memory-text">${escapeHTML(post.text_content || '')}</p>
        <div class="memory-meta">
          <span class="memory-time">${timeFormatted}</span>
          <button class="delete-card-btn" data-id="${post.id}">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
            Delete
          </button>
        </div>
      </div>
    `;
    
    // Attach delete handler
    card.querySelector('.delete-card-btn').addEventListener('click', () => {
      deleteMemory(post.id);
    });
    
    grid.appendChild(card);
  });
}

// Bucket List Render
function renderBucketList() {
  const listEl = document.getElementById('bucketList');
  listEl.innerHTML = '';
  
  AppState.bucketList.forEach((item) => {
    const li = document.createElement('li');
    li.className = `bucket-item ${item.completed ? 'completed' : ''}`;
    
    li.innerHTML = `
      <div class="bucket-left">
        <div class="bucket-checkbox"></div>
        <span class="bucket-text">${escapeHTML(item.text)}</span>
      </div>
      <button class="delete-item-btn" data-id="${item.id}" aria-label="Delete bucket item">
        &times;
      </button>
    `;
    
    // Toggle completed check status
    li.querySelector('.bucket-left').addEventListener('click', () => {
      toggleBucketItem(item.id);
    });
    
    // Delete item click
    li.querySelector('.delete-item-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteBucketItem(item.id);
    });
    
    listEl.appendChild(li);
  });
}

// Itinerary Schedule Timeline Render
function renderItinerary() {
  const timelineEl = document.getElementById('itineraryTimeline');
  timelineEl.innerHTML = '';
  
  if (AppState.itinerary.length === 0) {
    timelineEl.innerHTML = '<p class="column-desc text-center" style="margin-top: 40px; text-align: center;">No schedule items listed yet. Fill the form to create timeline notes!</p>';
    return;
  }
  
  // Group itinerary items by Day/Date
  const groups = {};
  AppState.itinerary.forEach(item => {
    if (!groups[item.day]) {
      groups[item.day] = [];
    }
    groups[item.day].push(item);
  });
  
  // Sort days based on Day label structure (e.g. Day 1, Day 2...)
  const dayKeys = Object.keys(groups).sort((a, b) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
  });
  
  dayKeys.forEach(day => {
    const dayGroup = document.createElement('div');
    dayGroup.className = 'itinerary-day-group';
    
    const title = document.createElement('h4');
    title.className = 'itinerary-day-title';
    title.textContent = day;
    dayGroup.appendChild(title);
    
    // Sort times inside each group roughly
    const items = groups[day].sort((a, b) => a.time.localeCompare(b.time));
    
    items.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'itinerary-item';
      itemEl.innerHTML = `
        <span class="itinerary-time-tag">${escapeHTML(item.time)}</span>
        <div class="itinerary-details">${escapeHTML(item.activity)}</div>
        <button class="delete-itinerary-btn" data-id="${item.id}" aria-label="Delete schedule row">&times;</button>
      `;
      
      itemEl.querySelector('.delete-itinerary-btn').addEventListener('click', () => {
        deleteItineraryItem(item.id);
      });
      
      dayGroup.appendChild(itemEl);
    });
    
    timelineEl.appendChild(dayGroup);
  });
}

// --- Data Mutation Actions ---

// Save / Delete Memory
async function deleteMemory(id) {
  if (confirm("Are you sure you want to delete this memory forever? 🌸")) {
    if (AppState.isSupabaseConfigured) {
      try {
        const { error } = await AppState.supabase
          .from('posts')
          .delete()
          .eq('id', id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to delete memory from Supabase, syncing locally:", err);
      }
    }
    
    // Update local state and save locally in case of failure or LocalMode
    AppState.memories = AppState.memories.filter(m => m.id !== id);
    localStorage.setItem('cherie_posts', JSON.stringify(AppState.memories));
    renderMemories();
  }
}

// Toggle / Add / Delete Bucket List Items
function toggleBucketItem(id) {
  AppState.bucketList = AppState.bucketList.map(item => {
    if (item.id === id) {
      return { ...item, completed: !item.completed };
    }
    return item;
  });
  localStorage.setItem('cherie_bucket', JSON.stringify(AppState.bucketList));
  renderBucketList();
}

function addBucketItem(text) {
  const newItem = {
    id: 'b-' + Date.now(),
    text: text,
    completed: false
  };
  AppState.bucketList.unshift(newItem);
  localStorage.setItem('cherie_bucket', JSON.stringify(AppState.bucketList));
  renderBucketList();
}

function deleteBucketItem(id) {
  AppState.bucketList = AppState.bucketList.filter(item => item.id !== id);
  localStorage.setItem('cherie_bucket', JSON.stringify(AppState.bucketList));
  renderBucketList();
}

// Add / Delete Itinerary Items
function addItineraryItem(day, time, activity) {
  const newItem = {
    id: 'i-' + Date.now(),
    day: day,
    time: time,
    activity: activity
  };
  AppState.itinerary.push(newItem);
  localStorage.setItem('cherie_itinerary', JSON.stringify(AppState.itinerary));
  renderItinerary();
}

function deleteItineraryItem(id) {
  AppState.itinerary = AppState.itinerary.filter(item => item.id !== id);
  localStorage.setItem('cherie_itinerary', JSON.stringify(AppState.itinerary));
  renderItinerary();
}

// --- Image Compression Helper ---
function resizeAndCompressImage(file, maxWidth = 800) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to 70% Quality Jpeg
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// --- Bind HTML Event Listeners ---
function bindUIEvents() {
  const memoryModal = document.getElementById('memoryModal');
  const settingsModal = document.getElementById('settingsModal');
  
  // Open / Close Modals
  document.getElementById('triggerAddMemory').addEventListener('click', () => {
    openModal(memoryModal);
  });
  
  document.querySelector('.trigger-add-memory-fallback').addEventListener('click', () => {
    openModal(memoryModal);
  });
  
  document.getElementById('closeMemoryModal').addEventListener('click', () => {
    closeModal(memoryModal);
  });
  
  document.getElementById('cancelMemoryBtn').addEventListener('click', () => {
    closeModal(memoryModal);
  });
  
  document.getElementById('openSettingsBtn').addEventListener('click', () => {
    openModal(settingsModal);
  });
  
  document.getElementById('closeSettingsModal').addEventListener('click', () => {
    closeModal(settingsModal);
  });
  
  document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
    closeModal(settingsModal);
  });

  // Handle Drag & Drop / Selection Preview in image upload box
  const uploadArea = document.getElementById('imageUploadArea');
  const imageInput = document.getElementById('imageInput');
  const previewContainer = document.getElementById('previewContainer');
  const imagePreview = document.getElementById('imagePreview');
  const removePreviewBtn = document.getElementById('removePreviewBtn');
  
  uploadArea.addEventListener('click', (e) => {
    // Prevent triggering click again on input if clicking wrapper
    if (e.target !== imageInput && e.target !== removePreviewBtn) {
      imageInput.click();
    }
  });

  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        previewContainer.classList.remove('hidden');
      };
      reader.readAsDataURL(file);
    }
  });

  removePreviewBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    imageInput.value = '';
    imagePreview.src = '';
    previewContainer.classList.add('hidden');
  });

  // Memory Submission
  const memoryForm = document.getElementById('memoryForm');
  const saveSpinner = document.getElementById('saveSpinner');
  const saveMemoryBtn = document.getElementById('saveMemoryBtn');
  
  memoryForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const captionText = document.getElementById('captionInput').value.trim();
    const imageFile = imageInput.files[0];
    
    if (!captionText && !imageFile) {
      alert("Please upload a photo or write a story caption to share! 🌸");
      return;
    }
    
    // UI Loading state
    saveSpinner.classList.remove('hidden');
    saveMemoryBtn.disabled = true;
    
    let uploadedImageUrl = '';
    
    try {
      if (imageFile) {
        if (AppState.isSupabaseConfigured) {
          // 1. Upload to Supabase Storage Bucket 'memories'
          const uniqueFilename = `${Date.now()}_${imageFile.name.replace(/\s+/g, '_')}`;
          
          const { data: uploadData, error: uploadError } = await AppState.supabase.storage
            .from('memories')
            .upload(uniqueFilename, imageFile, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: publicUrlData } = AppState.supabase.storage
            .from('memories')
            .getPublicUrl(uniqueFilename);
            
          uploadedImageUrl = publicUrlData.publicUrl;
        } else {
          // 2. Local fallback: Resize & compress image, convert to Base64
          uploadedImageUrl = await resizeAndCompressImage(imageFile, 800);
        }
      }
      
      // Save memory details
      const newMemory = {
        id: AppState.isSupabaseConfigured ? undefined : 'm-' + Date.now(),
        created_at: new Date().toISOString(),
        text_content: captionText,
        image_url: uploadedImageUrl
      };
      
      if (AppState.isSupabaseConfigured) {
        const { data, error } = await AppState.supabase
          .from('posts')
          .insert([newMemory])
          .select();
          
        if (error) throw error;
      } else {
        // Local mode save
        AppState.memories.unshift(newItemCleanId(newMemory));
        localStorage.setItem('cherie_posts', JSON.stringify(AppState.memories));
      }
      
      // Refresh UI memory list
      await loadData();
      
      // Clear forms & Close modal
      memoryForm.reset();
      previewContainer.classList.add('hidden');
      imagePreview.src = '';
      closeModal(memoryModal);
      
    } catch (err) {
      console.error("Error posting memory:", err);
      alert(`Oh pink pearls! Something went wrong: ${err.message || err}`);
    } finally {
      saveSpinner.classList.add('hidden');
      saveMemoryBtn.disabled = false;
    }
  });
  
  // Helper to ensure local items have clear IDs
  function newItemCleanId(item) {
    if (!item.id) item.id = 'm-' + Date.now();
    return item;
  }

  // Bucket list form submission
  document.getElementById('bucketForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('bucketInput');
    const text = input.value.trim();
    if (text) {
      addBucketItem(text);
      input.value = '';
    }
  });

  // Itinerary form submission
  document.getElementById('itineraryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const day = document.getElementById('itineraryDay').value.trim();
    const time = document.getElementById('itineraryTime').value.trim();
    const activity = document.getElementById('itineraryActivity').value.trim();
    
    if (day && time && activity) {
      addItineraryItem(day, time, activity);
      // Reset only time and activity, leave Day for easy consecutive adding!
      document.getElementById('itineraryTime').value = '';
      document.getElementById('itineraryActivity').value = '';
    }
  });

  // Settings Configuration Form Submission
  const settingsForm = document.getElementById('settingsForm');
  settingsForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    
    if (url && key) {
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_key', key);
      loadSupabaseCredentials();
      loadData();
      closeModal(settingsModal);
      alert("Config saved! Welcome to your synced pink dashboard 🌸");
    }
  });

  // Clear credentials
  document.getElementById('clearSettingsBtn').addEventListener('click', () => {
    if (confirm("Delete cloud database keys? Dashboard will revert back to browser local storage.")) {
      localStorage.removeItem('supabase_url');
      localStorage.removeItem('supabase_key');
      document.getElementById('supabaseUrl').value = '';
      document.getElementById('supabaseKey').value = '';
      setupLocalFallback();
      loadData();
      closeModal(settingsModal);
    }
  });
}

// Modal helper controls
function openModal(modal) {
  modal.classList.add('active');
  document.body.style.overflow = 'hidden'; // Lock background scroll
}

function closeModal(modal) {
  modal.classList.remove('active');
  document.body.style.overflow = ''; // Unlock background scroll
}

// Utility html escaping
function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// --- Butterfly Canvas Particle Engine ---
function initButterflyEngine() {
  const canvas = document.getElementById('butterflyCanvas');
  const ctx = canvas.getContext('2d');
  
  let width = canvas.width = window.innerWidth;
  let height = canvas.height = window.innerHeight;
  
  // Track butterflies active
  let butterflies = [];
  
  // Track gold fairy sparkles
  let sparkles = [];
  
  class Butterfly {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.size = Math.random() * 8 + 10; // 10px to 18px size
      this.colorIndex = Math.floor(Math.random() * 3); // 3 beautiful soft pink/purple shades
      
      // Speed properties (gentle upward drift)
      this.vy = -(Math.random() * 0.7 + 0.6); // moving up
      this.vx = 0; // modulated by sine drift
      this.driftAmplitude = Math.random() * 0.8 + 0.4;
      this.driftSpeed = Math.random() * 0.02 + 0.01;
      this.driftPhase = Math.random() * Math.PI * 2;
      
      // Flapping wing properties
      this.flapTime = Math.random() * 100;
      this.flapSpeed = Math.random() * 0.15 + 0.15;
      
      // Opacity / Lifetime
      this.opacity = 1;
      this.fadeSpeed = Math.random() * 0.002 + 0.0015; // Slow elegant fade out
      this.rotation = (Math.random() - 0.5) * 0.3; // leaning angle
    }
    
    update() {
      // Fluttering physics
      this.flapTime += this.flapSpeed;
      this.y += this.vy;
      
      // Sine wave drift left and right
      this.vx = Math.sin(this.flapTime * this.driftSpeed + this.driftPhase) * this.driftAmplitude;
      this.x += this.vx;
      
      // Slowly rotate matching direction of drift
      this.rotation = this.vx * 0.4;
      
      // Sparkle spawn trail randomly
      if (Math.random() < 0.15) {
        sparkles.push(new Sparkle(this.x, this.y, this.opacity));
      }
      
      // Fade out
      this.opacity -= this.fadeSpeed;
    }
    
    draw() {
      const flapScale = Math.abs(Math.sin(this.flapTime));
      
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);
      ctx.globalAlpha = Math.max(0, this.opacity);
      
      // Colors list
      const wingsColors = [
        ['rgba(255, 183, 197, 0.8)', 'rgba(255, 141, 161, 0.7)'], // Sweet cherry/rose pink
        ['rgba(226, 202, 252, 0.8)', 'rgba(198, 163, 237, 0.7)'], // Light purple violet
        ['rgba(255, 240, 245, 0.9)', 'rgba(255, 182, 193, 0.75)']  // White rose/lavender glow
      ];
      
      const colors = wingsColors[this.colorIndex];
      
      // Draw Left Wing (scales horizontally simulating flap depth)
      ctx.save();
      ctx.scale(flapScale, 1);
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      // Upper Wing node
      ctx.bezierCurveTo(-1, -1, -this.size, -this.size/2, -this.size, -this.size);
      ctx.bezierCurveTo(-this.size, -this.size*1.4, -this.size/2, -this.size*1.3, -1, -3);
      // Lower Wing node
      ctx.bezierCurveTo(-1, 0, -this.size*0.7, this.size/2, -this.size*0.6, this.size);
      ctx.bezierCurveTo(-this.size*0.5, this.size*1.2, -this.size/3, this.size, -0.5, 1.5);
      ctx.fill();
      ctx.restore();
      
      // Draw Right Wing (flipped X axis scale)
      ctx.save();
      ctx.scale(-flapScale, 1);
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      // Upper Wing node
      ctx.bezierCurveTo(-1, -1, -this.size, -this.size/2, -this.size, -this.size);
      ctx.bezierCurveTo(-this.size, -this.size*1.4, -this.size/2, -this.size*1.3, -1, -3);
      // Lower Wing node
      ctx.bezierCurveTo(-1, 0, -this.size*0.7, this.size/2, -this.size*0.6, this.size);
      ctx.bezierCurveTo(-this.size*0.5, this.size*1.2, -this.size/3, this.size, -0.5, 1.5);
      ctx.fill();
      ctx.restore();
      
      // Butterfly Central Body
      ctx.fillStyle = 'rgba(94, 75, 80, 0.55)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 1.2, this.size/2.5, 0, 0, Math.PI*2);
      ctx.fill();
      
      // Antennae loops
      ctx.strokeStyle = 'rgba(94, 75, 80, 0.45)';
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(-0.5, -this.size/2.5);
      ctx.quadraticCurveTo(-2, -this.size/2.5 - 3, -3, -this.size/2.5 - 5);
      ctx.moveTo(0.5, -this.size/2.5);
      ctx.quadraticCurveTo(2, -this.size/2.5 - 3, 3, -this.size/2.5 - 5);
      ctx.stroke();
      
      ctx.restore();
    }
  }
  
  // Sparkle details following wings
  class Sparkle {
    constructor(x, y, alpha) {
      this.x = x + (Math.random() - 0.5) * 6;
      this.y = y + (Math.random() - 0.5) * 6;
      this.size = Math.random() * 1.5 + 0.5;
      this.opacity = alpha * 0.8;
      this.fade = Math.random() * 0.02 + 0.015;
      this.vx = (Math.random() - 0.5) * 0.2;
      this.vy = Math.random() * 0.3 + 0.1; // slide slightly down
    }
    
    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.opacity -= this.fade;
    }
    
    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.opacity);
      // Glowing golden fairy color
      ctx.fillStyle = '#FFF5CD';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#F4D35E';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  
  // Canvas Loop
  function animate() {
    ctx.clearRect(0, 0, width, height);
    
    // 1. Update and Draw Butterflies
    butterflies = butterflies.filter(b => b.opacity > 0);
    butterflies.forEach(b => {
      b.update();
      b.draw();
    });
    
    // 2. Update and Draw Gold Sparkles
    sparkles = sparkles.filter(s => s.opacity > 0);
    sparkles.forEach(s => {
      s.update();
      s.draw();
    });
    
    requestAnimationFrame(animate);
  }
  
  // Trigger recursive randomized spawn scheduler (every 4-8 seconds)
  function triggerBurstScheduler() {
    const nextTimeout = Math.random() * 4000 + 4000; // 4000ms to 8000ms
    
    setTimeout(() => {
      spawnButterflyBurst();
      triggerBurstScheduler();
    }, nextTimeout);
  }
  
  // Burst spawning 1 to 3 butterflies
  function spawnButterflyBurst() {
    const burstCount = Math.floor(Math.random() * 3) + 1; // 1 to 3
    
    // Pick a starting point. Choose lower 3/4 area of the page to drift nicely
    const startX = Math.random() * width;
    const startY = height * 0.6 + Math.random() * (height * 0.3);
    
    for (let i = 0; i < burstCount; i++) {
      // Introduce slight delay or offset spacing
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = (Math.random() - 0.5) * 40;
      butterflies.push(new Butterfly(startX + offsetX, startY + offsetY));
    }
  }
  
  // Resize handler
  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });
  
  // Launch loop and schedule initial butterfly events
  animate();
  triggerBurstScheduler();
  
  // Immediately spawn a welcome butterfly group on initial load!
  setTimeout(spawnButterflyBurst, 1500);
}
