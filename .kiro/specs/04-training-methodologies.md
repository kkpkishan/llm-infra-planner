
## Description

Extend the training mode to support all major training methodologies (SFT, LoRA, QLoRA, DPO, GRPO, RLHF-PPO, ORPO, distillation), model output formats with conversion requirements, and dataset size estimation.

## Requirements

### Requirement 1: Training Method Selector
**User Story:** As a user, I want to pick my exact training method so the memory estimate accounts for the right number of models and optimizer states.

**Acceptance Criteria:**
- Dropdown with methods: `Pre-training`, `Continued Pre-training`, `SFT (Full)`, `SFT (LoRA)`, `SFT (QLoRA)`, `DPO`, `GRPO`, `RLHF-PPO`, `KTO`, `ORPO / SimPO / CPO`, `Distillation`
- Each method shows memory formula:
  - Pre-training/SFT Full: `16-20 B/param` (weights+grads+optimizer+master)
  - LoRA: `2N` frozen + `16 × N_trainable` + activations
  - QLoRA: `0.5N` NF4 + `16 × N_trainable` + activations
  - DPO: `18N` (policy 16N + reference 2N)
  - GRPO: `20N` (policy 16N + reference 2N + reward 2N)
  - RLHF-PPO: `36N` (actor 16N + critic 16N + reference 2N + reward 2N)
  - ORPO/SimPO/CPO: `16N` (reference-free)
  - Distillation: `16 × N_student + 2 × N_teacher`
- For LoRA/QLoRA: additional inputs for `rank` (4-128), `target_modules` (checkboxes: q, k, v, o, gate, up, down), `alpha`
- Computes trainable params from LoRA config: `Σ_modules (rank × (d_in + d_out))`

### Requirement 2: Dataset Size Estimator
**User Story:** As a user, I want to estimate storage and compute for my training dataset.

**Acceptance Criteria:**
- Inputs: dataset size (rows or tokens), format (JSONL, Parquet, HF Datasets), average sequence length
- Computes: raw size, tokenized size (tokens × 2B or 4B), compressed estimate
- Shows common reference datasets: FineWeb 15T (44TB), The Pile (825GB), SlimPajama (627B tokens), typical SFT datasets (10k-1M examples)
- Computes preprocessing estimate: tokenization time = tokens / 5M tokens/core × num_cores
- Shows total training FLOPs: `6 × N × D` for full training, `2 × N × D` for inference-only methods (LoRA forward)

### Requirement 3: Model Output Format Recommendations
**User Story:** As a user finishing training, I want to know what format to export my model in and what it costs to convert.

**Acceptance Criteria:**
- Format picker showing supported conversions from PyTorch/SafeTensors:
  - SafeTensors (default, zero cost)
  - GGUF: requires llama.cpp `convert_hf_to_gguf.py` + `llama-quantize` — time estimate
  - ONNX: `torch.onnx.export` — time estimate
  - TensorRT engine: GPU-arch specific, build time 5-30 min
  - CoreML: `coremltools` — Apple only
  - MLX: `mlx-lm.convert`
- Quantization time estimates: 7B ≈ 10-60 min, 13B ≈ 30min-2h, 70B ≈ 2-6h on A100

## Tasks

- [x] 1. Create `src/lib/formulas/training-methods.ts` — memory formulas for each method (pretrain, SFT, LoRA, QLoRA, DPO, GRPO, PPO, ORPO, distill)
- [x] 2. Create `src/lib/formulas/lora.ts` — LoRA trainable param computation from rank, target modules, model architecture
- [x] 3. Create `src/lib/formulas/dataset.ts` — dataset size estimation (raw, tokenized, compressed), preprocessing time, training FLOPs
- [x] 4. Create `src/components/calculator/TrainingMethodPicker.tsx` — dropdown with method descriptions, shows memory formula summary
- [x] 5. Create `src/components/calculator/LoRAConfig.tsx` — rank slider, target module checkboxes, trainable param count display
- [x] 6. Create `src/components/calculator/DatasetEstimator.tsx` — inputs for dataset size, shows storage + preprocessing estimates
- [x] 7. Create `src/components/calculator/FormatRecommendation.tsx` — shows available export formats with conversion cost
- [x] 8. Update `src/lib/formulas/vram.ts` to dispatch to correct training-method memory formula
- [x] 9. Write tests for PPO memory (7B should show ~252 GB), DPO (7B ~126 GB), QLoRA 70B (~48 GB)
- [x] 10. Add training method to URL state serialization



## Tasks

- [x] 1. Create `src/lib/formulas/training-methods.ts` — memory formulas for each method (pretrain, SFT, LoRA, QLoRA, DPO, GRPO, PPO, ORPO, distill)
- [x] 2. Create `src/lib/formulas/lora.ts` — LoRA trainable param computation from rank, target modules, model architecture
- [x] 3. Create `src/lib/formulas/dataset.ts` — dataset size estimation (raw, tokenized, compressed), preprocessing time, training FLOPs
- [x] 4. Create `src/components/calculator/TrainingMethodPicker.tsx` — dropdown with method descriptions, shows memory formula summary
- [x] 5. Create `src/components/calculator/LoRAConfig.tsx` — rank slider, target module checkboxes, trainable param count display
- [x] 6. Create `src/components/calculator/DatasetEstimator.tsx` — inputs for dataset size, shows storage + preprocessing estimates
- [x] 7. Create `src/components/calculator/FormatRecommendation.tsx` — shows available export formats with conversion cost
- [x] 8. Update `src/lib/formulas/vram.ts` to dispatch to correct training-method memory formula
- [x] 9. Write tests for PPO memory (7B should show ~252 GB), DPO (7B ~126 GB), QLoRA 70B (~48 GB)
- [x] 10. Add training method to URL state serialization
