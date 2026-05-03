/** Deterministic-ish random helpers for generating test data. */

const ADJECTIVES = ['Holy', 'Sacred', 'Blessed', 'Divine', 'Faithful', 'Graceful', 'Humble', 'Devout', 'Pious', 'Serene'];
const NOUNS      = ['Pilgrim', 'Shepherd', 'Candle', 'Cross', 'Prayer', 'Dove', 'Lamb', 'Chalice', 'Vessel', 'Light'];

const MESSAGES = [
  'Praying for all intentions shared today.',
  'Lord, hear our prayer.',
  'Thank you for this community of faith.',
  'Asking for intercession of the saints.',
  'May God bless everyone here.',
  'Grateful for this moment of prayer.',
  'United in spirit and prayer.',
  'Keeping everyone in my prayers.',
  'Trust in the Lord with all your heart.',
  'Let us lift each other up in prayer.',
  'Blessed are the peacemakers.',
  'Ave Maria, gratia plena.',
  'In the name of the Father, Son, and Holy Spirit.',
  'May the peace of Christ be with you.',
  'Praying for healing and strength.',
  'God is good, all the time.',
  'Offering this prayer for the sick.',
  'Remembering all the departed in prayer.',
  'Asking for wisdom and discernment.',
  'Grateful for God\'s mercy and love.',
];

const CATEGORIES = ['bible_study', 'mens_group', 'womens_group', 'young_adults', 'families', 'devotional', 'general'];

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomName(index) {
  return `${ADJECTIVES[index % ADJECTIVES.length]} ${NOUNS[index % NOUNS.length]}`;
}

function randomMessage() {
  return randomItem(MESSAGES);
}

function randomCategory() {
  return randomItem(CATEGORIES);
}

module.exports = { randomName, randomMessage, randomCategory, randomItem };
