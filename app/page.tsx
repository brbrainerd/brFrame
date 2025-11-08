export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">brFrame</h1>
        <p className="text-lg text-gray-600 mb-8">
          Daily historical photos from r/100yearsagotoday delivered to your digital frame
        </p>
        <div className="bg-gray-100 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Status</h2>
          <p className="text-green-600">Cron job running daily at 2:00 PM EST</p>
        </div>
      </div>
    </main>
  );
}
