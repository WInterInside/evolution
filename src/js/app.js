class ProfileDragDrop {
  constructor({ cardSelector, boardSelector, maxCards = 3 }) {
    this.cards = document.querySelectorAll(cardSelector);
    this.board = document.querySelector(boardSelector);
    this.maxCards = maxCards;

    this.currentCard = null;
    this.offsetX = 0;
    this.offsetY = 0;

    // Сохраняем плейсхолдеры карточек на доске
    this.placedPlaceholders = [];

    this.cards.forEach(card => {
      card.dataset.initialTransform = getComputedStyle(card).transform;
      this.attachDragEvents(card);
    });
  }

  attachDragEvents = card => {
    const startDrag = (x, y) => {
      this.currentCard = card;

      const rect = card.getBoundingClientRect();
      this.offsetX = x - rect.left;
      this.offsetY = y - rect.top;

      // создаём временный плейсхолдер только если его нет
      if (!card._placeholder && !card._placeholderSaved) {
        const placeholder = document.createElement('div');
        const style = getComputedStyle(card);
        placeholder.style.width = style.width;
        placeholder.style.height = style.height;
        placeholder.style.visibility = 'hidden';
        placeholder.className = 'profile__card-placeholder';
        card.parentNode.insertBefore(placeholder, card);
        card._placeholder = placeholder;
      }

      // фиксируем позицию без transform, чтобы не было смещения
      Object.assign(card.style, {
        position: 'fixed',
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        transform: 'none',
        zIndex: 1000
      });

      card.classList.add('dragging');
      card._startPos = { x, y };
    };

    // мышь
    card.addEventListener('mousedown', e => {
      startDrag(e.clientX, e.clientY);
      ['mousemove', 'mouseup'].forEach(evt =>
        document.addEventListener(evt, this[evt])
      );
    });

    // тач
    card.addEventListener('touchstart', e => {
      const { clientX, clientY } = e.touches[0];
      startDrag(clientX, clientY);
      ['touchmove', 'touchend'].forEach(evt =>
        document.addEventListener(evt, this[evt], {
          passive: evt === 'touchmove' ? false : true
        })
      );
    });
  };

  dragTo = (x, y) => {
    if (!this.currentCard) return;
    Object.assign(this.currentCard.style, {
      position: 'fixed',
      left: `${x - this.offsetX}px`,
      top: `${y - this.offsetY}px`,
      transform: 'none'
    });
  };

  mousemove = e => this.dragTo(e.clientX, e.clientY);
  touchmove = e => {
    if (!this.currentCard) return;
    e.preventDefault();
    this.dragTo(e.touches[0].clientX, e.touches[0].clientY);
  };

  mouseup = e => {
    this.dropCard(e.clientX, e.clientY);
    this.removeListeners();
  };
  touchend = e => {
    this.dropCard(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    this.removeListeners();
  };

  dropCard = (x, y) => {
    if (!this.currentCard) return;

    const { left, top, right, bottom } = this.board.getBoundingClientRect();
    const isInside = x > left && x < right && y > top && y < bottom;

    const placedCards = this.board.querySelectorAll('.profile__card');
    const stateImages = this.board.querySelectorAll('.profile__state-img');

    const dx = Math.abs(x - this.currentCard._startPos.x);
    const dy = Math.abs(y - this.currentCard._startPos.y);
    const moved = dx > 3 || dy > 3;

    const tempPlaceholder = this.currentCard._placeholder;
    const savedPlaceholder = this.currentCard._placeholderSaved;

    if (isInside && placedCards.length < this.maxCards && moved) {
      // Переносим на доску
      this.board.appendChild(this.currentCard);
      Object.assign(this.currentCard.style, {
        position: 'absolute',
        left: `${x - left - this.offsetX}px`,
        top: `${y - top - this.offsetY}px`,
        transform: this.getRotateFromMatrix(this.currentCard.dataset.initialTransform),
        zIndex: ''
      });

      // Сохраняем временный плейсхолдер как плейсхолдер доски
      if (tempPlaceholder) {
        this.placedPlaceholders.push(tempPlaceholder);
        this.currentCard._placeholderSaved = tempPlaceholder;
        tempPlaceholder.style.visibility = 'hidden';
        this.currentCard._placeholder = null;
      }

      const nextInactive = Array.from(stateImages).find(
        img => !img.classList.contains('is-active')
      );
      nextInactive && nextInactive.classList.add('is-active');
    } else {
      // Возвращаем на место
      const placeholder = tempPlaceholder || savedPlaceholder;
      if (placeholder) {
        placeholder.parentNode.insertBefore(this.currentCard, placeholder);
        if (tempPlaceholder) {
          tempPlaceholder.parentNode.removeChild(tempPlaceholder);
          this.currentCard._placeholder = null;
        }
      }

      Object.assign(this.currentCard.style, {
        position: '',
        left: '',
        top: '',
        transform: this.currentCard.dataset.initialTransform,
        zIndex: ''
      });
    }

    this.currentCard.classList.remove('dragging');
    this.currentCard = null;
  };

  removeListeners = () =>
    ['mousemove', 'mouseup', 'touchmove', 'touchend'].forEach(evt =>
      document.removeEventListener(evt, this[evt])
    );

  getRotateFromMatrix = matrix => {
    if (!matrix || matrix === 'none') return 'none';
    const values = matrix.match(/matrix\(([^)]+)\)/)?.[1]?.split(',') || [];
    const [a = 1, b = 0] = values.map(parseFloat);
    return `rotate(${Math.round(Math.atan2(b, a) * (180 / Math.PI))}deg)`;
  };
}

// Инициализация
document.addEventListener('DOMContentLoaded', () =>
  new ProfileDragDrop({
    cardSelector: '.profile__card',
    boardSelector: '.profile__state',
    maxCards: 3
  })
);

const swiper = new Swiper('.swiper', {
  slidesPerView: 3,
  centeredSlides: true,
  loop: true,
  spaceBetween: 0,
  initialSlide: 0, // 3-й слайд активный
  effect: 'coverflow',
  coverflowEffect: {
    rotate: 0,
    stretch: 0,
    depth: 300,
    modifier: 2,
    slideShadows: false
  },
  navigation: {
    nextEl: '.swiper-button-next',
    prevEl: '.swiper-button-prev',
  },
});

// Получаем все span с текстом
const titles = document.querySelectorAll('.swiper-title span');

// Функция для показа только соответствующего текста
function updateTitle() {
  titles.forEach((el, i) => {
    el.style.display = i === swiper.realIndex ? 'inline' : 'none';
  });
}

// Показываем правильный текст при инициализации
updateTitle();

// Меняем текст при смене слайда
swiper.on('slideChange', updateTitle);