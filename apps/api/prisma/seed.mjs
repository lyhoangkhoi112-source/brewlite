import { PrismaClient, ProductCategory, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

const products = [
  {
    id: '10000000-0000-4000-8000-000000000001',
    name: 'Cà phê sữa',
    description: 'Cà phê đậm đà kết hợp cùng sữa.',
    category: ProductCategory.COFFEE,
    basePrice: 25000,
    stockQuantity: 30,
    imageUrl: 'product/ca-phe-sua.png',
  },
  {
    id: '10000000-0000-4000-8000-000000000002',
    name: 'Trà sữa',
    description: 'Trà sữa thơm béo, có thể tùy chỉnh lượng đường và đá.',
    category: ProductCategory.MILK_TEA,
    basePrice: 30000,
    stockQuantity: 30,
    imageUrl: 'product/tra-sua.png',
  },
  {
    id: '10000000-0000-4000-8000-000000000003',
    name: 'Cà phê sữa dừa',
    description: 'Cà phê sữa kết hợp vị béo thơm của dừa.',
    category: ProductCategory.COFFEE,
    basePrice: 35000,
    stockQuantity: 20,
    imageUrl: 'product/cp-sua-dua.png',
  },
  {
    id: '10000000-0000-4000-8000-000000000004',
    name: 'Trân châu',
    description: 'Topping trân châu dùng kèm đồ uống.',
    category: ProductCategory.TOPPING,
    basePrice: 5000,
    stockQuantity: 50,
    imageUrl: 'product/tran-chau.png',
  },
].map((product) => ({
  ...product,
  status: ProductStatus.AVAILABLE,
}));

async function main() {
  for (const product of products) {
    const { id, stockQuantity, status, ...update } = product;
    await prisma.product.upsert({
      where: { id },
      create: product,
      update,
    });
  }

  console.info(`Seeded ${products.length} BrewLite catalog products.`);
}

main()
  .catch((error) => {
    console.error('Failed to seed the BrewLite database.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
