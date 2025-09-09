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

// Fungsi untuk membaca dan memposting tweet dari file teks secara berurutan
async function postTweetSequentially() {
  try {
    const fileContent = fs.readFileSync('tweet.txt', 'utf-8');
    // Pisahkan konten berdasarkan tanda '---', trim, dan filter baris kosong
    const tweets = fileContent
      .split('---')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (tweets.length === 0) {
      console.error("Kesalahan: Tidak ada kalimat yang ditemukan di dalam file tweet.txt.");
      return;
    }
    
    // Baca indeks terakhir dari file .index
    let currentIndex = 0;
    try {
        const indexContent = fs.readFileSync('.index', 'utf-8');
        currentIndex = parseInt(indexContent.trim());
        if (isNaN(currentIndex) || currentIndex < 0 || currentIndex >= tweets.length) {
            currentIndex = 0; // Atur ulang indeks jika tidak valid
        }
    } catch (error) {
        fs.writeFileSync('.index', '0'); // Buat file .index jika belum ada
    }

    // Ambil tweet sesuai indeks
    const tweetText = tweets[currentIndex];

    // Kirim tweet ke Twitter API
    const { data: createdTweet } = await client.v2.tweet(tweetText);

    console.log("Tweet berhasil dikirim!");
    console.log(`Teks: "${tweetText}"`);
    console.log(`ID Tweet: ${createdTweet.id}`);

    // Perbarui indeks untuk postingan berikutnya
    const nextIndex = (currentIndex + 1) % tweets.length;
    fs.writeFileSync('.index', nextIndex.toString());

  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error("Kesalahan: File 'tweet.txt' atau '.index' tidak ditemukan.");
    } else {
      console.error("Terjadi kesalahan saat memposting tweet:", error);
      if (error.code === 403) {
        console.error("Pastikan Anda memiliki izin 'Read and Write' untuk bot ini di Twitter Developer Portal.");
      }
    }
  }
}

// Langsung panggil fungsi saat skrip dijalankan
console.log('Bot Twitter dimulai. Memposting tweet pertama sekarang...');
postTweetSequentially();

// Jadwalkan untuk posting berikutnya setiap 8 jam
console.log('Menunggu jadwal untuk memposting tweet berikutnya setiap 8 jam.');
cron.schedule('0 */8 * * *', () => {
  console.log(`Menjalankan tugas posting tweet pada ${new Date().toLocaleString()}`);
  postTweetSequentially();
}, {
  timezone: "Asia/Jakarta" // Atur zona waktu ke WIB (Waktu Indonesia Barat)
});
