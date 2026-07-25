import { requestHandler } from "@/shared/utils/request.js";
import type { AuthRequest } from "@/shared/types/request.js";
import { createContractAwardSchema } from "./contract-award.schema.js";
import { ContractAwardService } from "./contract-award.service.js";

const service = new ContractAwardService();

export const createContractAward = requestHandler<AuthRequest>(
  async (req, res) => {
    const data = createContractAwardSchema.parse(req.body);
    const award = await service.create(data, req.user);

    return res.status(201).json({
      success: true,
      data: award,
    });
  },
);
