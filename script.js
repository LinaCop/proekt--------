const burger = document.getElementById('burger');
const menu = document.getElementById('sideMenu');
const page = document.querySelector('.page');

burger.addEventListener('click', () => {
    menu.classList.toggle('open');
    page.classList.toggle('shift');
    burger.classList.toggle('active');
});

