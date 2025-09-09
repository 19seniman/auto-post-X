import { TwitterApi } from 'twitter-api-v2';
import dotenv from 'dotenv';
import fs from 'fs';
import cron from 'node-cron';

// Muat variabel lingkungan dari file .env
dotenv.config();

// Kredensial diambil dari file .env
const appKey = process.env.TWITTER_APP_KEY;
const appSecret = process.env.TWITTER_APP_SECRET;
const accessToken = process.env.TWITTER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_ACCESS_SECRET;

if (!appKey || !appSecret || !accessToken || !accessSecret) {
  console.error("Kesalahan: Kredensial Twitter API tidak ditemukan. Pastikan file .env sudah diatur dengan benar.");
  process.exit(1);
}

// Inisialisasi klien Twitter dengan kredensial dari .env
const client = new TwitterApi({
  appKey,
  appSecret,
  accessToken,
  accessSecret,
});

// Fungsi untuk membaca dan memposting tweet dari file teks
async function postTweetFromFile() {
  try {
    const fileContent = fs.readFileSync('tweet.txt', 'utf-8');
    const tweets = fileContent.split('\n').map(line => line.trim()).filter(line => line.length > 0);

    if (tweets.length === 0) {
      console.error("Kesalahan: Tidak ada kalimat yang ditemukan di dalam file tweet.txt.");
      return;
    }

    // Pilih tweet secara acak dari daftar
    const tweetText = tweets[Math.floor(Math.random() * tweets.length)];

    // Kirim tweet ke Twitter API
    const { data: createdTweet } = await client.v2.tweet(tweetText);

    console.log("Tweet berhasil dikirim!");
    console.log(`Teks: "${tweetText}"`);
    console.log(`ID Tweet: ${createdTweet.id}`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error("Kesalahan: File 'tweet.txt' tidak ditemukan. Pastikan file tersebut ada di folder yang sama.");
    } else {
      console.error("Terjadi kesalahan saat memposting tweet:", error);
      if (error.code === 403) {
        console.error("Pastikan Anda memiliki izin 'Read and Write' untuk bot ini di Twitter Developer Portal.");
      }
    }
  }
}

// --- BAGIAN INTI PERUBAHAN ---

// 1. Langsung panggil fungsi saat skrip dijalankan
console.log('Bot Twitter dimulai. Memposting tweet pertama sekarang...');
postTweetFromFile();

// 2. Jadwalkan untuk posting berikutnya setiap 8 jam
// Format cron: 'menit jam hari-dalam-bulan bulan hari-dalam-minggu'
// '0 */8 * * *' berarti pada menit ke-0, setiap 8 jam.
console.log('Menunggu jadwal untuk memposting tweet berikutnya setiap 8 jam.');
cron.schedule('0 */8 * * *', () => {
  console.log(`Menjalankan tugas posting tweet pada ${new Date().toLocaleString()}`);
  postTweetFromFile();
}, {
  timezone: "Asia/Jakarta" // Atur zona waktu ke WIB (Waktu Indonesia Barat)
});
