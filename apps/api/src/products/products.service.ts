import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
import type { Product } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { FindProductsDto } from './dto/find-products.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findProductsByName(name: string): Promise<Product[]> {
    const products = await this.prisma.product.findMany({
      where: {
        name: { contains: name, mode: 'insensitive' /* Lọc chuỗi không phân biệt chữ hoa hay thường */},
      },
    });
    if (products.length === 0) {
      throw new NotFoundException(
        `Không tìm thấy sản phẩm nào có tên: ${name}`,
      );
    }
    return products;
  }

  async findAll(filters: FindProductsDto): Promise<Product[]> {
    const where: Prisma.ProductWhereInput = {
      ...(filters.search
        ? { name: { contains: filters.search.trim(), mode: 'insensitive' } }
        : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<Product> {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }
    return product;
  }

  async createProducts(products: CreateProductDto[]) {
    const normalizedProducts = products.map((product) =>
      this.normalizeCreateInput(product),
    );
    await this.ensureActiveNamesAvailable(normalizedProducts);

    try {
      return await this.prisma.product.createMany({
        data: normalizedProducts.map((product) => this.toCreateData(product)),
      });
    } catch (error) {
      this.throwIfDuplicateName(error);
      throw error;
    }
  }

  async update(id: string, input: UpdateProductDto): Promise<Product> {
    const current = await this.findOne(id);
    const name = input.name?.trim() ?? current.name;
    const status = input.status ?? current.status;
    await this.ensureActiveNamesAvailable([{ name, status }], id);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: {
          ...(input.name !== undefined ? { name } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() || null }
            : {}),
          ...(input.category !== undefined ? { category: input.category } : {}),
          ...(input.basePrice !== undefined
            ? { basePrice: new Prisma.Decimal(input.basePrice) }
            : {}),
          ...(input.stockQuantity !== undefined
            ? { stockQuantity: input.stockQuantity }
            : {}),
          ...(input.imageUrl !== undefined
            ? { imageUrl: input.imageUrl?.trim() || null }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
    } catch (error) {
      this.throwIfDuplicateName(error);
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }
      throw error;
    }
  }

  async softDelete(id: string): Promise<Product> {
    return this.update(id, { status: ProductStatus.UNAVAILABLE });
  }

  private toCreateData(input: CreateProductDto): Prisma.ProductCreateManyInput {
    if (!input.name) {
      throw new BadRequestException('Tên sản phẩm không được để trống');
    }
    return {
      name: input.name,
      description: input.description?.trim() || null,
      category: input.category,
      basePrice: new Prisma.Decimal(input.basePrice),
      stockQuantity: input.stockQuantity ?? 0,
      imageUrl: input.imageUrl?.trim() || null,
      status: input.status ?? ProductStatus.AVAILABLE,
    };
  }

  private normalizeCreateInput(input: CreateProductDto): CreateProductDto {
    return {
      name: input.name.trim(),
      description: input.description,
      category: input.category,
      basePrice: input.basePrice,
      stockQuantity: input.stockQuantity,
      imageUrl: input.imageUrl,
      status: input.status,
    };
  }

  private async ensureActiveNamesAvailable(
    products: Array<{ name: string; status?: ProductStatus }>,
    excludeId?: string,
  ): Promise<void> {
    const activeNames = products
      .filter((product) => product.status !== ProductStatus.UNAVAILABLE)
      .map((product) => product.name);
    if (activeNames.some((name) => name.length === 0)) {
      throw new BadRequestException('Tên sản phẩm không được để trống');
    }

    const uniqueNames = new Map<string, string>();
    for (const name of activeNames) {
      const key = name.toLowerCase();
      if (uniqueNames.has(key)) {
        throw new ConflictException(`Sản phẩm "${name}" đã tồn tại`);
      }
      uniqueNames.set(key, name);
    }
    if (uniqueNames.size === 0) return;

    const existing = await this.prisma.product.findFirst({
      where: {
        status: { not: ProductStatus.UNAVAILABLE },
        ...(excludeId ? { id: { not: excludeId } } : {}),
        OR: [...uniqueNames.values()].map((name) => ({
          name: { equals: name, mode: 'insensitive' },
        })),
      },
      select: { name: true },
    });
    if (existing) {
      throw new ConflictException(`Sản phẩm "${existing.name}" đã tồn tại`);
    }
  }

  private throwIfDuplicateName(error: unknown): void {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Tên sản phẩm đã tồn tại');
    }
  }
}

/* Giải thích luồng xử lý của hàm ensureActiveNamesAvailable:

1.Bỏ qua sản phẩm UNAVAILABLE
Hàm chỉ kiểm tra tên của sản phẩm có trạng thái khác UNAVAILABLE. Nếu status không được truyền, sản phẩm vẫn được xem là đang hoạt động.

2.Kiểm tra tên rỗng
Nếu có tên rỗng trong nhóm cần kiểm tra, hàm báo 400 Bad Request.

3.Tìm tên trùng ngay trong danh sách đầu vào
Hàm chuyển tên thành chữ thường để so sánh. Ví dụ, Latte và LATTE trong cùng một lần tạo sẽ bị xem là trùng và báo 409 Conflict.

4.Kiểm tra trong cơ sở dữ liệu
Nếu có tên cần kiểm tra, hàm truy vấn sản phẩm đang hoạt động có tên trùng, không phân biệt hoa/thường. Nếu đang cập nhật một sản phẩm, excludeId loại chính sản phẩm đó khỏi truy vấn để nó không bị tính là trùng với chính nó.

5.Báo lỗi nếu tìm thấy
Nếu cơ sở dữ liệu trả về một sản phẩm trùng tên, hàm báo 409 Conflict và nêu tên sản phẩm đó.*/