import Game from '@/components/Game';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Quadratic Shooter | 平方完成トレーニング',
  description: '平方完成を素早く計算してターゲットを射抜くトレーニングアプリ。',
};

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <Game />
    </main>
  );
}
