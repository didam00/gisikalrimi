import axios from 'axios';
import * as cheerio from 'cheerio';

const [BREAKFAST, LUNCH, DINNER] = [0, 1, 2];
const DAY_TIMES = 24 * 60 * 60 * 1000;

export default async function handler(req, res) {
  let targetURL;
  let date = new Date();
  let time = LUNCH;
  let day = date.getDay();

  if (Object.keys(req.query).length !== 0) {
    date.setFullYear(req.query.year);
    date.setMonth(req.query.month - 1);
    date.setDate(req.query.date);
    time = req.query.time;

    let targetURLParamsDate = toDate8(new Date(date - date.getDay() * DAY_TIMES));
    targetURL = `https://www.kunsan.ac.kr/dormi/index.kunsan?menuCd=DOM_000000704006003000&cpath=%2Fdormi&sdate=${targetURLParamsDate}`;
  } else {
    targetURL = 'https://www.kunsan.ac.kr/dormi/index.kunsan?menuCd=DOM_000000704006003000';

    if (day === 5 || day === 6) {
      if (date.getHours() < 13) {
        time = LUNCH;
      } else if (date.getHours() <= 18 && date.getMinutes() < 40) {
        time = DINNER;
      } else {
        time = BREAKFAST;
        date.setDate(date.getDate() + 1);
      }
    } else {
      if (date.getHours() < 9) {
        time = BREAKFAST;
      } else if (date.getHours() <= 13 && date.getMinutes() < 30) {
        time = LUNCH;
      } else if (date.getHours() < 19) {
        time = DINNER;
      } else {
        time = BREAKFAST;
        date.setDate(date.getDate() + 1);
      }
    }
  }

  day = date.getDay() === 0 ? 6 : date.getDay() - 1;

  console.log(date.getFullYear(), date.getMonth() + 1, date.getDate(), time, day);

  try {
    const { data } = await axios.get(targetURL);
    const $ = cheerio.load(data);
    const dietData = [];

    $('table tbody tr').slice(4, 7).each((index, element) => {
      const row = [];
      $(element).find('td').each((i, el) => {
        row.push($(el).text().trim().split(" "));
      });
      dietData.push(row);
    });

    const resBody = {
      data: dietData[time][day],
    };

    res.status(200).json(resBody);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error scraping data' });
  }
}

function toDate8(date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}