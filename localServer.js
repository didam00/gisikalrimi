import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';

const app = express();
const PORT = 3000;

const [BREAKFAST, LUNCH, DINNER] = [0, 1, 2];
const DAY_TIMES = 24 * 60 * 60 * 1000;

app.get('/menu', async (req, res) => {
  let targetURL;
  let date = new Date(new Date().getTime()); // KST
  let time = LUNCH;
  let day = date.getDay();

  let pass = false;

  if (Object.keys(req.query).length !== 0) {
    date.setFullYear(req.query.year);
    date.setMonth(req.query.month - 1);
    date.setDate(req.query.date);
    time = req.query.time;

    let targetURLParamsDate = toDate8(new Date(date - (date.getDay() || 6) * DAY_TIMES));
    targetURL = `https://www.kunsan.ac.kr/dormi/index.kunsan?menuCd=DOM_000000704006003000&cpath=%2Fdormi&sdate=${targetURLParamsDate}`;
  } else {
    let targetURLParamsDate = toDate8(new Date(date - (date.getDay() || 6) * DAY_TIMES));
    targetURL = `https://www.kunsan.ac.kr/dormi/index.kunsan?menuCd=DOM_000000704006003000&cpath=%2Fdormi&sdate=${targetURLParamsDate}`;

    if (day === 0 || day === 6) {
      if (date.getHours() < 9) pass = true;

      if (date.getHours() < 13) {
        time = LUNCH;
      } else if (date.getHours() <= 18 || (date.getHours() == 18 && date.getMinutes() < 40)) {
        time = DINNER;
      } else {
        if (day === 6) pass = true;
        time = day === 6 ? LUNCH : BREAKFAST;
        date.setDate(date.getDate() + 1);
      }
    } else {
      if (date.getHours() < 9) {
        time = BREAKFAST;
      } else if (date.getHours() <= 13 || (date.getHours() == 13 && date.getMinutes() < 30)) {
        time = LUNCH;
      } else if (date.getHours() < 19) {
        time = DINNER;
      } else {
        if (day === 5) pass = true;
        time = day === 5 ? LUNCH : BREAKFAST;
        date.setDate(date.getDate() + 1);
      }
    }
  }

  day = date.getDay() === 0 ? 6 : date.getDay() - 1;

  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let yil = date.getDate();

  try {
    const { data } = await axios.get(targetURL);
    const $ = cheerio.load(data);
    const dietData = [];

    $('table tbody tr').slice(4, 7).each((index, element) => {
      const row = [];
      $(element)
        .find('td')
        .each((i, el) => {
          row.push($(el).text().trim().split(' '));
        });
      dietData.push(row);
    });

    let responseText =
      `다음은 ${year}년 ${month}월 ${yil}일의 ${['아침', '점심', '저녁'][time]} 식단입니다!` +
      (pass ? '\n다음 아침 식사는 미제공하므로 점심을 알려드리겠습니다!' : '') +
      '\n\n' +
      dietData[time][day].map((item) => `· ${item}`).join('\n') +
      '\n\n맛있는 식사되십시오! 🫡';

    const resBody = {
      version: '2.0',
      template: {
        outputs: [
          {
            simpleText: {
              text: responseText,
            },
          },
        ],
      },
    };

    res.status(200).json(resBody);
  } catch (error) {
    res.status(500).json({
      message: 'Error scraping data',
      body: error.message,
      date: date,
      time: time,
      day: day,
      pass: pass,
      targetURL: targetURL,
    });
  }
});

function toDate8(date) {
  return date.toISOString().split('T')[0].replace(/-/g, '');
}

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
