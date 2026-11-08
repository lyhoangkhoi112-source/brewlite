import { Test } from '@nestjs/testing';
import { ProductCategory, ProductStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductsService } from './products.service.js';

describe('ProductsService', () => {
  let service: ProductsService;
  const prisma = {
    product: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    prisma.product.findUnique.mockResolvedValue({
      id: 'product-id',
      name: 'Latte',
      status: ProductStatus.AVAILABLE,
    });
    const module = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get(ProductsService);
  });

  it('searches by name, category, and status when filters are supplied', async () => {
    prisma.product.findMany.mockResolvedValue([]);

    await service.findAll({
      search: ' latte ',
      category: ProductCategory.COFFEE,
      status: ProductStatus.UNAVAILABLE,
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith({
      where: {
        name: { contains: 'latte', mode: 'insensitive' },
        category: ProductCategory.COFFEE,
        status: ProductStatus.UNAVAILABLE,
      },
      orderBy: { name: 'asc' },
    });
  });

  it('creates products with normalized optional values and defaults', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({});

    await service.create({
      name: ' Latte ',
      basePrice: 25000,
    });

    const data = prisma.product.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: 'Latte',
      description: null,
      stockQuantity: 0,
      imageUrl: null,
      status: ProductStatus.AVAILABLE,
    });
    expect(data.basePrice.toString()).toBe('25000');
  });

  it('rejects a name already used by an active product, ignoring case', async () => {
    prisma.product.findFirst.mockResolvedValue({ name: 'Latte' });

    await expect(
      service.create({ name: ' latte ', basePrice: 25000 }),
    ).rejects.toThrow('Sản phẩm "Latte" đã tồn tại');

    expect(prisma.product.create).not.toHaveBeenCalled();
  });

  it('allows creating a name previously used only by an unavailable product', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    prisma.product.create.mockResolvedValue({
      id: 'new-product-id',
      name: 'Latte',
      status: ProductStatus.AVAILABLE,
    });

    await service.create({ name: 'Latte', basePrice: 25000 });

    expect(prisma.product.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: ProductStatus.UNAVAILABLE },
        }),
      }),
    );
    expect(prisma.product.create).toHaveBeenCalledOnce();
  });

  it('rejects duplicate active names in the same create-many request', async () => {
    await expect(
      service.createProducts([
        { name: 'Latte', basePrice: 25000 },
        { name: ' latte ', basePrice: 27000 },
      ]),
    ).rejects.toThrow('Sản phẩm "latte" đã tồn tại');

    expect(prisma.product.createMany).not.toHaveBeenCalled();
  });

  it('soft-deletes a product by changing only its status', async () => {
    prisma.product.update.mockResolvedValue({
      id: 'product-id',
      status: ProductStatus.UNAVAILABLE,
    });

    await service.softDelete('product-id');

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'product-id' },
      data: { status: ProductStatus.UNAVAILABLE },
    });
  });
});
