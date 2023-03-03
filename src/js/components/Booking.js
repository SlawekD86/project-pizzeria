import { templates, select, settings, classNames } from '../settings.js';
import AmountWidget from './AmountWidget.js';
import utils from '../utils.js';
import DatePicker from './DatePicker.js';
import HourPicker from './HourPicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();
  }

  getData() {
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {
      booking: [startDateParam, endDateParam],

      eventsCurrent: [settings.db.notRepeatParam, startDateParam, endDateParam],

      eventsRepeat: [settings.db.repeatParam, endDateParam],
    };

    //console.log('getData params', params);

    const urls = {
      booking: settings.db.url + '/' + settings.db.booking + '?' + params.booking.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.event + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.event + '?' + params.eventsRepeat.join('&'),
    };

    //console.log('getData urls', urls);

    Promise.all([fetch(urls.booking), fetch(urls.eventsCurrent), fetch(urls.eventsRepeat)])
      .then(function (allResponses) {
        const bookingResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        if (!bookingResponse.ok || !eventsCurrentResponse.ok || !eventsRepeatResponse.ok) {
          throw new Error('There was a problem fetching data.');
        }
        return Promise.all([bookingResponse.json(), eventsCurrentResponse.json(), eventsRepeatResponse.json()]);
      })
      .then(function ([booking, eventsCurrent, eventsRepeat]) {
        // console.log(booking);
        // console.log(eventsCurrent);
        // console.log(eventsRepeat);
        thisBooking.parseData(booking, eventsCurrent, eventsRepeat);
      })
      .catch(function (error) {
        console.error(error);
      });
  }

  parseData(booking, eventsCurrent, eventsRepeat) {
    const thisBooking = this;

    thisBooking.booked = {};

    for (let item of booking) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }

    if (eventsCurrent.length) {
      for (let item of eventsCurrent) {
        thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
      }
    }

    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }

    // console.log('thisBooking.booked', thisBooking.booked);

    thisBooking.updateDOM();
  }

  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }

    const startHour = utils.hourToNumber(hour);

    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
    }
  }

  updateDOM() {
    const thisBooking = this;

    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    const allAvailable = typeof thisBooking.booked[thisBooking.date] == 'undefined' || typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined';

    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (!allAvailable && thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId)) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }

    for (let table of thisBooking.dom.tables) {

      if (table.classList.contains('selected')) {

        table.classList.remove('selected');
      }
    }

    thisBooking.selectedTable = null;
  }

  render(element) {
    const thisBooking = this;

    const generatedHTML = templates.bookingWidget();
    const generatedDOM = utils.createDOMFromHTML(generatedHTML);
    const bookingWrapper = document.querySelector(select.containerOf.booking);
    bookingWrapper.appendChild(generatedDOM);

    thisBooking.dom = {
      wrapper: element,
      peopleAmount: element.querySelector(select.booking.peopleAmount),
      hoursAmount: element.querySelector(select.booking.hoursAmount),
      datePicker: element.querySelector(select.widgets.datePicker.wrapper),
      hourPicker: element.querySelector(select.widgets.hourPicker.wrapper),
      tables: element.querySelectorAll(select.booking.tables),
      tableContainer: element.querySelector(select.containerOf.tableContainer),
      duration: element.querySelector(select.booking.duration),
      bookTableBtn: element.querySelector(select.containerOf.bookTableBtn),
      address: element.querySelector(select.booking.address),
      phone: element.querySelector(select.booking.phone),
      starters: element.querySelectorAll(select.booking.starters),
      ppl: element.querySelector(select.booking.ppl),
    };
  }

  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);
    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });

    thisBooking.dom.tableContainer.addEventListener('click', function (event) {
      event.preventDefault();

      const table = event.target;

      if (table.classList.contains(classNames.booking.tableBooked) && table.classList.contains(classNames.booking.table)) {

        return window.alert('you cannot book this table, it is already booked');
      }

      if (table.classList.contains(classNames.booking.tableSelected)) {

        table.classList.remove(classNames.booking.tableSelected);
        thisBooking.updateDOM();


      } else if (!table.classList.contains(classNames.booking.tableSelected)) {

        thisBooking.updateDOM(); //aktualizuje wygląd tabeli
        const tableId = table.getAttribute(settings.booking.tableIdAttribute);
        table.classList.add(classNames.booking.tableSelected);
        thisBooking.selectedTable = parseInt(tableId);
      }
    });

    thisBooking.dom.bookTableBtn.addEventListener('click', function (event) {
      event.preventDefault();
      thisBooking.sendBooking();
    });
  }

  sendBooking() {
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.booking;

    const payload = {
      date: thisBooking.datePicker.value,
      hour: thisBooking.hourPicker.value,
      table: parseInt(thisBooking.selectedTable),
      duration: parseInt(thisBooking.dom.duration.value),
      ppl: parseInt(thisBooking.dom.ppl.value),
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };

    for (let starter of thisBooking.dom.starters) {
      if (starter.checked) {
        payload.starters.push(starter.value);
      }
    }

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options)
      .then(function (response) {
        return response.json();
      })
      .then(function (parsedResponse) {
        alert('Thank you for your booking!');
        thisBooking.makeBooked(parsedResponse.date, parsedResponse.hour, parsedResponse.duration, parsedResponse.table);
        thisBooking.updateDOM();
      });
  }
}

export default Booking;
