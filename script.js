    let currentAyah, currentSurah, currentAyahNumber, currentSurahNumber;
let score = 0;
let bestScore = 0;
let timer;
let timeLeft;
let checkButtonClicked = false;
let audioPlayer;

function removeDiacriticsAndSpecialChars(text) {
  return text.replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, '');
}

async function fetchRandomAyah() {
  const selectedSurah = document.getElementById('surahSelect').value;
  const surahNumber = selectedSurah === 'random' ? Math.floor(Math.random() * 114) + 1 : parseInt(selectedSurah);
  const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/ar.asad`);
  const data = await response.json();
  const surah = data.data;
  const randomAyahNumber = Math.floor(Math.random() * surah.numberOfAyahs) + 1;
  return {
    text: surah.ayahs[randomAyahNumber - 1].text,
    surahName: surah.name,
    surahNumber: surah.number,
    ayahNumber: randomAyahNumber
  };
}

async function displayAyah() {
  document.getElementById('ayah').innerHTML = '<div class="loading-dots"><span></span><span></span><span></span></div>';
  document.getElementById('ayahInfo').textContent = '';
  document.getElementById('audioButton').style.display = 'none';
  
  const ayahData = await fetchRandomAyah();
  currentAyah = ayahData.text;
  currentSurah = ayahData.surahName;
  currentAyahNumber = ayahData.ayahNumber;
  currentSurahNumber = ayahData.surahNumber;

  updateAyahDisplay();

  document.getElementById('ayahInfo').textContent = `${currentSurah} - الآية ${currentAyahNumber}`;
  document.getElementById('userInput').value = '';
  document.getElementById('result').textContent = '';
  document.getElementById('tafsir').textContent = '';

  document.getElementById('checkButton').disabled = false;
  checkButtonClicked = false;

  document.getElementById('audioButton').onclick = toggleAudio;
  document.getElementById('audioButton').classList.remove('playing');
  document.getElementById('audioButton').innerHTML = '<i class="fas fa-volume-up"></i> استمع إلى الآية';

  if (audioPlayer) {
    audioPlayer.pause();
    audioPlayer = null;
  }

  startTimer();
}

function updateAyahDisplay() {
  const words = currentAyah.split(' ');
  const middleIndex = Math.floor(words.length / 2);
  const visiblePart = words.slice(0, middleIndex).join(' ');
  const displayText = document.getElementById('tashkilToggle').checked ? visiblePart : removeDiacriticsAndSpecialChars(visiblePart);

  document.getElementById('ayah').innerHTML = `${displayText} <span class="incomplete">...</span>`;
}

async function checkAnswer() {
  if (checkButtonClicked) return;
  
  checkButtonClicked = true;
  document.getElementById('checkButton').disabled = true;
  clearInterval(timer);

  const userInput = document.getElementById('userInput').value.trim();
  const words = currentAyah.split(' ');
  const middleIndex = Math.floor(words.length / 2);
  const correctAnswer = words.slice(middleIndex).join(' ');

  const normalizeArabicText = (text) => {
    text = text.replace(/\u0640/g, '');
    text = text.replace(/[\u064B-\u065F\u0670]/g, '');
    text = text.replace(/[.,!؟،:;\u061F\u060C\u061B]/g, '');
    text = text.replace(/[أإآا]/g, 'ا');
    text = text.replace(/[يى]/g, 'ي');
    text = text.replace(/ة/g, 'ه');
    return text.replace(/[^\u0621-\u063A\u0641-\u064A\s]/g, '').trim();
  };

  const userInputProcessed = normalizeArabicText(userInput);
  const correctAnswerProcessed = normalizeArabicText(correctAnswer);

  if (userInputProcessed === correctAnswerProcessed) {
    document.getElementById('result').innerHTML = '<i class="fas fa-check-circle"></i> أحسنت! إجابة صحيحة';
    document.getElementById('result').style.color = '#4CAF50';
    score += 5;
    if (score > bestScore) {
      bestScore = score;
      document.getElementById('bestScoreValue').textContent = bestScore;
      localStorage.setItem('bestScore', bestScore);
    }
  } else {
    document.getElementById('result').innerHTML = '<i class="fas fa-times-circle"></i> للأسف، إجابة خاطئة. الإجابة الصحيحة هي: ' + correctAnswer;
    document.getElementById('result').style.color = '#F44336';
    score = 0;
  }

  document.getElementById('scoreValue').textContent = score;
  document.getElementById('audioButton').style.display = 'block';

  try {
    const tafsirResponse = await fetch(`https://api.alquran.cloud/v1/ayah/${currentSurahNumber}:${currentAyahNumber}/ar.muyassar`);
    const tafsirData = await tafsirResponse.json();
    if (tafsirData.code === 200 && tafsirData.data && tafsirData.data.text) {
      document.getElementById('tafsir').innerHTML = `<strong>تفسير الآية:</strong><br>${tafsirData.data.text}`;
    } else {
      throw new Error('Invalid response from Tafsir API');
    }
  } catch (error) {
    console.error('Error fetching Tafsir:', error);
    document.getElementById('tafsir').innerHTML = 'عذرًا، لم نتمكن من جلب التفسير في هذه اللحظة.';
  }
}

function toggleAudio() {
  const audioButton = document.getElementById('audioButton');
  
  if (audioPlayer && !audioPlayer.paused) {
    audioPlayer.pause();
    audioPlayer.currentTime = 0;
    audioButton.innerHTML = '<i class="fas fa-volume-up"></i> استمع إلى الآية';
    audioButton.classList.remove('playing');
  } else {
    const audioUrl = `https://api.alquran.cloud/v1/ayah/${currentSurahNumber}:${currentAyahNumber}/ar.alafasy`;
    fetch(audioUrl)
      .then(response => response.json())
      .then(data => {
        audioPlayer = new Audio(data.data.audio);
        audioPlayer.play();
        audioButton.innerHTML = '<i class="fas fa-stop"></i> إيقاف الصوت';
        audioButton.classList.add('playing');
        
        audioPlayer.onended = function() {
          audioButton.innerHTML = '<i class="fas fa-volume-up"></i> استمع إلى الآية';
          audioButton.classList.remove('playing');
        };
      })
      .catch(error => console.error('Error playing audio:', error));
  }
}

function nextAyah() {
  displayAyah();
}

function startTimer() {
  clearInterval(timer);
  timeLeft = getSelectedTime();
  updateTimerDisplay();
  timer = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timer);
      checkAnswer();
    }
  }, 1000);
}

function updateTimerDisplay() {
  document.getElementById('timeLeft').textContent = timeLeft;
  const timerElement = document.getElementById('timer');
  if (timeLeft <= 10) {
    timerElement.classList.add('pulse');
  } else {
    timerElement.classList.remove('pulse');
  }
}

function toggleTheme() {
  document.body.classList.toggle('light-theme');
  const themeIcon = document.querySelector('#themeToggle i');
  if (document.body.classList.contains('light-theme')) {
    themeIcon.classList.remove('fa-sun');
    themeIcon.classList.add('fa-moon');
  } else {
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
  }
}

async function populateSurahSelect() {
  const response = await fetch('https://api.alquran.cloud/v1/meta');
  const data = await response.json();
  const surahs = data.data.surahs.references;
  const select = document.getElementById('surahSelect');
  surahs.forEach(surah => {
    const option = document.createElement('option');
    option.value = surah.number;
    option.textContent = `${surah.name}`;
    select.appendChild(option);
  });
}

function getSelectedTime() {
  const timerSelect = document.getElementById('timerSelect');
  const selectedValue = timerSelect.value;
  if (selectedValue === 'custom') {
    return parseInt(document.getElementById('customTimerInput').value) || 60;
  }
  return parseInt(selectedValue);
}

function showShareCard() {
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('shareCard').style.display = 'block';
}

function hideShareCard() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('shareCard').style.display = 'none';
}

function copyLink() {
  const shareText = `تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد`;
  const shareUrl = window.location.href;
  const fullText = `${shareText}\n${shareUrl}`;

  navigator.clipboard.writeText(fullText).then(() => {
    alert('تم نسخ الرابط بنجاح!');
  }).catch(err => {
    console.error('Failed to copy: ', err);
  });
}

function shareOnFacebook() {
  const shareUrl = encodeURIComponent(window.location.href);
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
}

function shareOnTwitter() {
  const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد`);
  const shareUrl = encodeURIComponent(window.location.href);
  window.open(`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank');
}

function shareOnWhatsApp() {
  const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد \n${window.location.href}`);
  window.open(`https://wa.me/?text=${shareText}`, '_blank');
}

function shareGame() {
  showShareCard();
}

function toggleDropdown() {
  document.getElementById("myDropdown").classList.toggle("show");
}

function adjustLayout() {
  const dropdown = document.querySelector('.dropdown');
  const contactShare = document.querySelector('.contact-share');
  
  if (window.innerWidth <= 600) {
    dropdown.style.display = 'block';
    contactShare.style.display = 'none';
  } else {
    dropdown.style.display = 'none';
    contactShare.style.display = 'flex';
  }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('surahSelect').addEventListener('change', displayAyah);
  document.getElementById('timerSelect').addEventListener('change', function() {
    const customInput = document.getElementById('customTimerInput');
    if (this.value === 'custom') {
      customInput.style.display = 'inline-block';
    } else {
      customInput.style.display = 'none';
    }
    startTimer();
  });
  document.getElementById('customTimerInput').addEventListener('change', startTimer);
  document.getElementById('tashkilToggle').addEventListener('change', updateAyahDisplay);
  document.getElementById('shareLink').addEventListener('click', shareGame);
  document.getElementById('mobileShareLink').addEventListener('click', shareGame);
  document.getElementById('closeShareCard').addEventListener('click', hideShareCard);
  document.getElementById('overlay').addEventListener('click', hideShareCard);
  document.getElementById('copyLink').addEventListener('click', copyLink);
  window.addEventListener('resize', adjustLayout);

  // Initialize
  bestScore = parseInt(localStorage.getItem('bestScore')) || 0;
  document.getElementById('bestScoreValue').textContent = bestScore;
  populateSurahSelect();
  displayAyah();
  adjustLayout();
});

// Close dropdown when clicking outside
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName("dropdown-content");
    for (var i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}
    
    function shareOnLinkedIn() {
    const shareUrl = encodeURIComponent(window.location.href);
    const shareText = encodeURIComponent('تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد');
    window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${shareUrl}&title=${shareText}`, '_blank');
}

function shareOnTelegram() {
    const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد\n${window.location.href}`);
    window.open(`https://t.me/share/url?url=${shareText}`, '_blank');
}

// Update the existing shareOnTwitter function to use X branding
function shareOnTwitter() {
    const shareText = encodeURIComponent(`تحدي إكمال الآيات القرآنية - اختبر حفظك للقرآن الكريم وأكمل الآيات في الوقت المحدد`);
    const shareUrl = encodeURIComponent(window.location.href);
    window.open(`https://x.com/intent/tweet?text=${shareText}&url=${shareUrl}`, '_blank');
}