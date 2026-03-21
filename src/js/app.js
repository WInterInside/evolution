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

		this.currentCard.classList.add('is-active');

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
	slidesPerView: 2,
	centeredSlides: true,
	loop: false,
	spaceBetween: 0,
	initialSlide: 2,
	effect: 'coverflow',

	coverflowEffect: {
		rotate: 0,
		stretch: 0,
		depth: 500,
		modifier: 2,
		slideShadows: false
	},

	breakpoints: {
		800: {
			slidesPerView: 3,

			coverflowEffect: {
				depth: 400,
			}
		}
	},

	navigation: {
		nextEl: '.swiper-button-next',
		prevEl: '.swiper-button-prev',
	},
});
const titles = document.querySelectorAll('.swiper-title span');
const finishImage = document.querySelector('.activation__finish');
const ticketImage = document.querySelector('.ticket__preview');

function updateUI() {
	// текст
	titles.forEach((el, i) => {
		el.style.display = i === swiper.realIndex ? 'inline' : 'none';
	});

	// активный слайд через swiper
	const activeSlide = swiper.slides[swiper.activeIndex];
	const img = activeSlide.querySelector('img');

	if (img) {
		finishImage.src = img.src;
		ticketImage.src = img.src;
	}
}

// старт
updateUI();

// ВАЖНО: после завершения анимации
swiper.on('slideChange', updateUI);
swiper.on('transitionEnd', updateUI);
swiper.on('touchEnd', updateUI);

class MazeGame {
	constructor(canvasId, imgSrc, start, finish) {
		this.canvas = document.getElementById(canvasId);
		this.ctx = this.canvas.getContext("2d");
		const isMobile = window.innerWidth < 767;
		// UI элемент
		this.startEl = document.querySelector(".activation__start");

		// скрытый канвас для коллизий
		this.collisionCanvas = document.createElement("canvas");
		this.collisionCtx = this.collisionCanvas.getContext("2d");
		this.body = document.body;
		this.img = new Image();
		this.img.src = imgSrc;

		this.START = start;
		this.FINISH = finish;

		this.playing = false;
		this.playerRadius = isMobile ? 6 : 11;

		this.playerX = this.START.x;
		this.playerY = this.START.y;

		this.img.onload = () => {
			this.canvas.width = this.img.width;
			this.canvas.height = this.img.height;

			this.collisionCanvas.width = this.img.width;
			this.collisionCanvas.height = this.img.height;
			this.collisionCtx.drawImage(this.img, 0, 0);
			this.positionStartElement(); // 👈 ВАЖНО
			this.draw();
		};

		this.initEvents();
	}

	positionStartElement() {
		if (!this.startEl) return;

		// только десктоп
		if (window.innerWidth <= 767) return;

		const rect = this.canvas.getBoundingClientRect();

		// масштаб
		const scaleX = rect.width / this.canvas.width;
		const scaleY = rect.height / this.canvas.height;

		// координаты центра старта
		const x = this.START.x * scaleX;
		const y = this.START.y * scaleY;

		// берём реальные размеры элемента из CSS
		const elWidth = this.startEl.offsetWidth;
		const elHeight = this.startEl.offsetHeight;

		// позиционируем по центру
		this.startEl.style.left = `${x - elWidth / 2}px`;
		this.startEl.style.top = `${y - elHeight / 2}px`;
	}
	
	initEvents() {
		// мышь
		this.canvas.addEventListener("mousedown", e => this.startGame(this.getCoords(e)));
		this.canvas.addEventListener("mousemove", e => this.move(this.getCoords(e)));
		this.canvas.addEventListener("mouseup", () => this.resetPlayer());
		this.canvas.addEventListener("mouseleave", () => {
			if (this.playing) this.lose();
		});

		// тач
		this.canvas.addEventListener("touchstart", e =>
			this.startGame(this.getCoords(e.touches[0]))
		);

		this.canvas.addEventListener("touchmove", e => {
			e.preventDefault();
			this.move(this.getCoords(e.touches[0]));
		});

		this.canvas.addEventListener("touchend", () => this.resetPlayer());

		window.addEventListener("resize", () => this.draw());
	}

	getCoords(e) {
		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		return {
			x: Math.floor((e.clientX - rect.left) * scaleX),
			y: Math.floor((e.clientY - rect.top) * scaleY)
		};
	}

	inCircle(x, y, circle) {
		const dx = x - circle.x;
		const dy = y - circle.y;
		return dx * dx + dy * dy <= circle.r * circle.r;
	}

	// проверка финишной линии
	isOnFinishLine(x, y) {
		const { x1, y1, x2, y2 } = this.FINISH;

		const A = x - x1;
		const B = y - y1;
		const C = x2 - x1;
		const D = y2 - y1;

		const dot = A * C + B * D;
		const lenSq = C * C + D * D;
		let param = dot / lenSq;

		if (param < 0) param = 0;
		else if (param > 1) param = 1;

		const closestX = x1 + param * C;
		const closestY = y1 + param * D;

		const dx = x - closestX;
		const dy = y - closestY;

		const distance = Math.sqrt(dx * dx + dy * dy);

		return distance <= this.playerRadius + 2;
	}

	checkCollision(x, y) {
		if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) {
			return true;
		}

		const [r, g, b] = this.collisionCtx.getImageData(x, y, 1, 1).data;
		return r < 40 && g < 40 && b < 40;
	}

	startGame({ x, y }) {
		if (this.inCircle(x, y, this.START)) {
			this.playing = true;

			if (this.startEl) {
				this.startEl.classList.add("is-active");
			}
		}
	}

	move({ x, y }) {
		if (!this.playing) return;

		if (this.checkCollision(x, y)) {
			this.lose();
			return;
		}

		this.playerX = x;
		this.playerY = y;

		if (this.isOnFinishLine(x, y)) {
			this.win();
			return;
		}

		this.draw();
	}

	draw() {
		const { ctx, canvas } = this;

		ctx.clearRect(0, 0, canvas.width, canvas.height);
		ctx.drawImage(this.img, 0, 0);

		ctx.beginPath();
		ctx.arc(this.START.x, this.START.y, this.START.r, 0, Math.PI * 2);
		ctx.fillStyle = "transparent";
		ctx.fill();

		// финиш (невидимая линия)
		ctx.beginPath();
		ctx.moveTo(this.FINISH.x1, this.FINISH.y1);
		ctx.lineTo(this.FINISH.x2, this.FINISH.y2);
		ctx.strokeStyle = "transparent";
		ctx.lineWidth = 16;
		ctx.stroke();

		// игрок
		ctx.beginPath();
		ctx.arc(this.playerX, this.playerY, this.playerRadius, 0, Math.PI * 2);
		ctx.fillStyle = "#EB631C";
		ctx.fill();
	}

	resetPlayer() {
		this.playing = false;
		this.playerX = this.START.x;
		this.playerY = this.START.y;

		if (this.startEl) {
			this.startEl.classList.remove("is-active");
		}

		this.draw();
	}

	lose() {
		this.body.classList.remove('is-success');
		this.body.classList.add('is-error');

		this.resetPlayer();
	}

	win() {
		this.body.classList.remove('is-error');
		this.body.classList.add('is-success');

		this.resetPlayer();
	}
}

// Настройки для десктопа
const desktopConfig = {
	canvasId: "mazeCanvas",
	imgSrc: "assets/images/maze.png",
	START: { x: 144, y: 90, r: 40 },
	FINISH: { x1: 1310, y1: 400, x2: 1310, y2: 355 }
};

// Настройки для мобильной версии
const mobileConfig = {
	canvasId: "mazeCanvas",
	imgSrc: "assets/images/maze-mobile.png",
	START: { x: 320, y: 70, r: 30 },
	FINISH: { x1: 164, y1: 800, x2: 164, y2: 660 }
};

// Удаляем старый канвас/игру, если ресайз
function initMazeGame() {
	const canvas = document.getElementById("mazeCanvas");
	if (!canvas) return;

	// Определяем экран
	const isMobile = window.innerWidth < 768;

	// Настройки под экран
	const config = isMobile ? mobileConfig : desktopConfig;

	// Инициализация игры
	new MazeGame(config.canvasId, config.imgSrc, config.START, config.FINISH);
}

// Инициализация при загрузке
window.addEventListener("load", initMazeGame);
// Обновление при изменении размера
window.addEventListener("resize", () => {
	// Для перезапуска игры при изменении ориентации экрана
	initMazeGame();
});

const errorOverlay = document.querySelector('.error-overlay');

if (errorOverlay) {
  errorOverlay.addEventListener('click', () => {
    document.body.classList.remove('is-error');
  });
}

const activeBtn = document.querySelector('.activation__button');

if (activeBtn) {
  activeBtn.addEventListener('click', () => {
    document.body.classList.add('is-activated');
  });
}

(function () {
  const SELECTOR_1 = ".header__body";
  const SELECTOR_2 = ".activation__text-decor img";
  const SELECTOR_3 = ".activation__instruction";

  let svg;

  // Создаем SVG для линий
  function createSVG() {
    svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("id", "connector-svg");

    Object.assign(svg.style, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      pointerEvents: "none",
      zIndex: 9999
    });

    document.body.appendChild(svg);
  }

  // Получаем центр элемента
  function getCenter(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top + rect.height / 2 + window.scrollY
    };
  }

  // Нижняя точка элемента
  function getBottomOfElement(el) {
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.bottom + window.scrollY // нижняя граница
    };
  }

  // Рисуем кривую Безье
  function drawCurve(p1, p2) {
    const dx = Math.abs(p1.x - p2.x) * 0.5;

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");

    const d = `
      M ${p1.x} ${p1.y}
      C ${p1.x + dx} ${p1.y},
        ${p2.x - dx} ${p2.y},
        ${p2.x} ${p2.y}
    `;

    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#000");
    path.setAttribute("stroke-width", "2");

    // Анимация "рисования линии"
    const length = path.getTotalLength();
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;

    path.getBoundingClientRect(); // триггер рендеринга
    path.style.transition = "stroke-dashoffset 1.2s ease";
    path.style.strokeDashoffset = "0";

    svg.appendChild(path);
  }

  // Основная функция рисования линий
  function draw() {
    const el1 = document.querySelector(SELECTOR_1);
    const el2 = document.querySelector(SELECTOR_2);
    const el3 = document.querySelector(SELECTOR_3);

    if (!el1 || !el2 || !el3) return;

    if (!svg) createSVG();

    svg.innerHTML = "";

    const p1 = getBottomOfElement(el1); // нижняя граница header__body
    const p2 = getCenter(el2);
    const p3 = getCenter(el3);

    drawCurve(p1, p2);
    drawCurve(p1, p3);
  }

  // Инициализация
  function init() {
    draw();
    window.addEventListener("resize", draw);
    window.addEventListener("scroll", draw);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();