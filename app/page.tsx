import Link from 'next/link';
import { pointRewards } from '@/app/lib/point-activities';

const stats = [
  { label: '會員數', value: '12.4K' },
  { label: '評價數', value: '48.7K' },
  { label: '抽獎活動', value: '36' },
  { label: '兌換活動', value: String(pointRewards.length) },
];

const hotProducts = [
  { name: '阿華田冰淇淋風味飲品', score: '4.9', store: '7-11' },
  { name: '炭烤雞腿便當', score: '4.8', store: 'FamilyMart' },
  { name: '抹茶拿鐵', score: '4.7', store: 'OK Mart' },
  { name: '鹽之花蛋糕', score: '4.6', store: '7-11' },
];

export default function HomePage() {
  return (
    <div className="page-stack">
      <section className="hero card">
        <div>
          <span className="eyebrow">超商飲食評價社群</span>
          <h1>跟朋友一起找出最值得買的超商商品</h1>
          <p>
            分享購買心得、累積積分、升級會員，還能參加抽獎活動，讓你每次買東西都更有方向。
          </p>
          <div className="cta-row">
            <Link href="/signup" className="button primary">
              立即加入
            </Link>
            <Link href="/feed" className="button secondary">
              看熱門動態
            </Link>
          </div>
        </div>
      </section>

      <section className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.label} className="card stat-card">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </section>

      <section className="card section-card">
        <div className="section-header">
          <h2>熱門商品</h2>
          <Link href="/feed">查看全部</Link>
        </div>
        <div className="list-grid">
          {hotProducts.map((item) => (
            <div key={item.name} className="product-item">
              <div className="product-topline">
                <span className="tag">{item.store}</span>
                <span className="rating">⭐ {item.score}</span>
              </div>
              <h3>{item.name}</h3>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
