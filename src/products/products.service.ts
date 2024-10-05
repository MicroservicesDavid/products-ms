import { Injectable, Logger, OnModuleInit, Query } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaClient } from '@prisma/client';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class ProductsService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger('ProductService');

  onModuleInit() {
    this.logger.log('Database connected');
  }

  async create(createProductDto: CreateProductDto) {
    return this.product.create({
      data: createProductDto,
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit, page } = paginationDto;
    const skip = (page - 1) * limit;
    try {
      const [products, total] = await Promise.all([
        this.product.findMany({
          where: { available: true },
          take: limit,
          skip: skip,
        }),
        this.product.count({ where: { available: true } }),
      ]);
      return {
        data: products,
        meta: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error('Error fetching available products', error.stack);
      throw error;
    }
  }

  async findOne(id: number) {
    try {
      const product = await this.product.findUnique({
        where: { id },
      });
      if (!product && !product.available) {
        const error = new Error(`Product with id ${id} not found`);
        error['statusCode'] = 404;
        throw error;
      }
      return product;
    } catch (error) {
      this.logger.error(`Error fetching product with id ${id}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    const { id: __, ...data } = updateProductDto;
    try {
      const existingProduct = await this.product.findUnique({
        where: { id },
      });
      if (!existingProduct || !existingProduct.available) {
        const error = new Error(
          `Product with id ${id} not found or not available`,
        );
        error['statusCode'] = 404;
        throw error;
      }
      const updatedProduct = await this.product.update({
        where: { id, available: true },
        data,
      });
      return updatedProduct;
    } catch (error) {
      this.logger.error(`Error updating product with id ${id}`, error.stack);
      throw error;
    }
  }

  async remove(id: number) {
    try {
      const existingProduct = await this.product.findUnique({
        where: { id },
      });
      if (!existingProduct || !existingProduct.available) {
        const error = new Error(
          `Product with id ${id} not found or already unavailable`,
        );
        error['statusCode'] = 404;
        throw error;
      }
      const product = await this.product.update({
        where: { id, available: true },
        data: { available: false },
      });
      return product;
    } catch (error) {
      this.logger.error(
        `Error updating product availability with id ${id}`,
        error.stack,
      );
      throw error;
    }
  }
}
