const storeConfig = {
  brandName: '宠之寓',
  slogan: '把毛孩子的日常，安放得更妥帖',
  openingHours: '周一至周日 09:30-21:00',
  phone: 'TEL:18989234810',
  address: '冕宁县丽景尚城后门旁5栋1号',
  status: '营业中',
  promoTitle: '新客福利',
  promoText: '首次洗护 9 折',
  bookingTipTitle: '今日附近可约',
  bookingTipText: '热门服务建议提前 1 天预约，寄养建议提前 3 天沟通。',
  notice: '新客洗护 9 折，寄养提前 3 天预约享房型优先。',
  notices: [
    {
      id: 'notice-break-202605',
      title: '临时歇业通知',
      content: '店主有事，5 月 24 日至 5 月 26 日暂停营业，5 月 27 日恢复正常接待。',
      level: 'important',
      enabled: true
    },
    {
      id: 'notice-new-customer',
      title: '新客福利',
      content: '新客洗护 9 折，寄养提前 3 天预约享房型优先。',
      level: 'normal',
      enabled: true
    }
  ],
  miniProgramPath: '/pages/home/home',
  quickActions: [
    { id: 'book', label: '预约洗护', icon: 'wash', path: '/pages/booking/booking' },
    { id: 'boarding', label: '安心寄养', icon: 'home', path: '/pages/services/services?category=boarding' },
    { id: 'shop', label: '用品商城', icon: 'bag', path: '/pages/shop/shop' },
    { id: 'member', label: '会员福利', icon: 'heart', path: '/pages/profile/profile' }
  ],
  heroImages: [
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=1200&q=80'
  ]
};

const serviceCategories = [
  { id: 'all', name: '全部' },
  { id: 'grooming', name: '洗护美容' },
  { id: 'boarding', name: '寄养托管' },
  { id: 'health', name: '健康护理' },
  { id: 'training', name: '训练咨询' }
];

const services = [
  {
    id: 'svc-bath',
    category: 'grooming',
    name: '元气基础洗护',
    summary: '温和清洁、吹干梳理、耳眼护理、足底修剪',
    price: 88,
    unit: '起',
    duration: 75,
    suitable: '猫咪 / 小中型犬',
    tags: ['新客推荐', '温和护理'],
    cover: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=900&q=80',
    featured: true
  },
  {
    id: 'svc-style',
    category: 'grooming',
    name: '精致造型修剪',
    summary: '品种造型、局部修整、毛发养护建议',
    price: 168,
    unit: '起',
    duration: 120,
    suitable: '犬只为主',
    tags: ['造型师服务', '需预约'],
    cover: 'https://images.unsplash.com/photo-1517423568366-8b83523034fd?auto=format&fit=crop&w=900&q=80',
    featured: true
  },
  {
    id: 'svc-boarding-cat',
    category: 'boarding',
    name: '猫咪独立寓所',
    summary: '独立猫房、每日清洁、远程照片反馈',
    price: 99,
    unit: '晚',
    duration: 1440,
    suitable: '猫咪',
    tags: ['独立空间', '每日反馈'],
    cover: 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?auto=format&fit=crop&w=900&q=80',
    featured: true
  },
  {
    id: 'svc-boarding-dog',
    category: 'boarding',
    name: '狗狗日托陪伴',
    summary: '分区活动、定时喂食、基础陪玩',
    price: 128,
    unit: '天',
    duration: 480,
    suitable: '小中型犬',
    tags: ['活动分区', '可接送'],
    cover: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=900&q=80',
    featured: false
  },
  {
    id: 'svc-health',
    category: 'health',
    name: '日常健康护理',
    summary: '指甲修剪、耳道清洁、泪痕护理、口腔观察',
    price: 58,
    unit: '起',
    duration: 40,
    suitable: '猫咪 / 犬只',
    tags: ['高频护理', '可加购'],
    cover: 'https://images.unsplash.com/photo-1558788353-f76d92427f16?auto=format&fit=crop&w=900&q=80',
    featured: false
  },
  {
    id: 'svc-training',
    category: 'training',
    name: '行为习惯咨询',
    summary: '拆家、吠叫、分离焦虑等行为评估与训练建议',
    price: 199,
    unit: '次',
    duration: 60,
    suitable: '犬只为主',
    tags: ['一对一', '顾问服务'],
    cover: 'https://images.unsplash.com/photo-1507146426996-ef05306b995a?auto=format&fit=crop&w=900&q=80',
    featured: false
  }
];

const petSizeOptions = [
  {
    id: 'small',
    name: '小型',
    ranges: { dog: '7kg 以下', cat: '4kg 以下', other: '5kg 以下' },
    hint: '适合小体型、幼宠或轻量宠物'
  },
  {
    id: 'medium',
    name: '中型',
    ranges: { dog: '7-18kg', cat: '4-7kg', other: '5-15kg' },
    hint: '多数家庭宠物常见体型'
  },
  {
    id: 'large',
    name: '大型',
    ranges: { dog: '18kg 以上', cat: '7kg 以上', other: '15kg 以上' },
    hint: '毛量、耗时和护理强度更高'
  }
];

const servicePriceRules = {
  sizeDeltas: {
    small: 0,
    medium: 40,
    large: 80
  },
  typeDeltasByCategory: {
    grooming: { dog: 0, cat: 20, other: 30 },
    boarding: { dog: 0, cat: 0, other: 30 },
    health: { dog: 0, cat: 0, other: 20 },
    training: { dog: 0, cat: 50, other: 50 }
  }
};

function calculateServicePrice(service, petType = 'dog', petSize = 'small') {
  if (!service) {
    return 0;
  }
  const normalizedType = ['dog', 'cat', 'other'].includes(petType) ? petType : 'other';
  const normalizedSize = petSizeOptions.some((item) => item.id === petSize) ? petSize : 'small';
  const typeDeltas = servicePriceRules.typeDeltasByCategory[service.category] || {};
  const amount = Number(service.price || 0)
    + Number(servicePriceRules.sizeDeltas[normalizedSize] || 0)
    + Number(typeDeltas[normalizedType] || 0);
  return Math.max(0, Math.round(amount));
}

function inferPetSizeByWeight(petType = 'dog', weight = '') {
  const value = Number(weight);
  if (!Number.isFinite(value) || value <= 0) {
    return '';
  }
  if (petType === 'cat') {
    if (value < 4) return 'small';
    if (value < 7) return 'medium';
    return 'large';
  }
  if (petType === 'dog') {
    if (value < 7) return 'small';
    if (value < 18) return 'medium';
    return 'large';
  }
  if (value < 5) return 'small';
  if (value < 15) return 'medium';
  return 'large';
}

const productCategories = [
  { id: 'all', name: '全部' },
  { id: 'food', name: '主粮零食' },
  { id: 'care', name: '清洁护理' },
  { id: 'toy', name: '玩具互动' },
  { id: 'daily', name: '日常用品' }
];

const products = [
  {
    id: 'prd-food-01',
    category: 'food',
    name: '幼猫高蛋白主粮 1.5kg',
    price: 129,
    originalPrice: 159,
    stock: 42,
    tags: ['高复购', '会员价'],
    image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'prd-care-01',
    category: 'care',
    name: '低敏宠物香波 500ml',
    price: 69,
    originalPrice: 89,
    stock: 28,
    tags: ['洗护同款'],
    image: 'https://images.unsplash.com/photo-1601758063890-1167f394febb?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'prd-toy-01',
    category: 'toy',
    name: '耐咬绳结互动玩具',
    price: 39,
    originalPrice: 49,
    stock: 64,
    tags: ['解压'],
    image: 'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'prd-daily-01',
    category: 'daily',
    name: '便携外出饮水杯',
    price: 59,
    originalPrice: 79,
    stock: 31,
    tags: ['外出必备'],
    image: 'https://images.unsplash.com/photo-1561037404-61cd46aa615b?auto=format&fit=crop&w=800&q=80'
  }
];

const coupons = [
  { id: 'cp-new', title: '新客洗护 9 折', threshold: 0, discount: '9 折', validTo: '2026-06-30' },
  { id: 'cp-board', title: '寄养满 3 晚减 60', threshold: 300, discount: '60 元', validTo: '2026-07-31' },
  { id: 'cp-shop', title: '用品满 199 减 30', threshold: 199, discount: '30 元', validTo: '2026-06-15' }
];

const member = {
  id: 'mem-demo',
  name: '宠友',
  level: '银爪会员',
  points: 1260,
  pets: [
    { id: 'pet-1', name: '团团', type: 'dog', breed: '柯基', age: '2 岁' },
    { id: 'pet-2', name: '杏仁', type: 'cat', breed: '英短', age: '1 岁' }
  ]
};

const bookings = [
  {
    id: 'bk-demo-001',
    serviceId: 'svc-bath',
    serviceName: '元气基础洗护',
    petName: '团团',
    customerName: '李女士',
    phone: '13800138000',
    date: '2026-05-18',
    time: '10:30',
    status: 'confirmed',
    createdAt: '2026-05-17T10:00:00.000Z'
  }
];

const orders = [
  {
    id: 'ord-demo-001',
    title: '元气基础洗护',
    phone: '13800138000',
    amount: 88,
    status: '已预约',
    date: '2026-05-18 10:30'
  },
  {
    id: 'ord-demo-002',
    title: '低敏宠物香波 500ml',
    phone: '13800138000',
    amount: 69,
    status: '已完成',
    date: '2026-05-12 16:05'
  }
];

function buildSlots(serviceId) {
  const now = new Date();
  const service = services.find((item) => item.id === serviceId) || services[0];
  const baseTimes = service.category === 'boarding'
    ? ['10:00', '12:00', '15:00', '18:00']
    : ['09:30', '10:30', '13:30', '15:00', '17:30', '19:00'];

  return Array.from({ length: 7 }).map((_, index) => {
    const date = new Date(now);
    date.setDate(now.getDate() + index + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return {
      date: `${yyyy}-${mm}-${dd}`,
      label: `${mm}/${dd}`,
      weekday: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()],
      times: baseTimes.map((time, timeIndex) => ({
        time,
        available: !(index === 0 && timeIndex === 1)
      }))
    };
  });
}

module.exports = {
  storeConfig,
  serviceCategories,
  services,
  petSizeOptions,
  servicePriceRules,
  calculateServicePrice,
  inferPetSizeByWeight,
  productCategories,
  products,
  coupons,
  member,
  bookings,
  orders,
  buildSlots
};
