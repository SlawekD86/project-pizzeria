import { select, templates } from '../settings.js';
import utils from '../utils.js';

class Home {
  constructor(element) {
    const thisHome = this;

    thisHome.render(element);
    thisHome.carousel();
  }

  render() {
    const thisHome = this;

    const generatedHTML = templates.home();
    const generatedDOM = utils.createDOMFromHTML(generatedHTML);
    const homeWrapper = document.querySelector(select.containerOf.home);

    homeWrapper.appendChild(generatedDOM);

    thisHome.dom = {};
  }

  carousel() {
    // eslint-disable-next-line no-undef
    new Flickity(select.containerOf.carousel, {
      imagesLoaded: true,
      percentPosition: false,
      autoPlay: true,
      prevNextButtons: false,
    });
  }
}

export default Home;
