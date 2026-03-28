// Copyright 2026 Google LLC.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.


#include <cstdio>

struct LiteRtLmGemmaModelConstraintProvider {
    int dummy;
};

extern "C" {

void* LiteRtLmGemmaModelConstraintProvider_Create(
    const char* serialized_sp_model_proto, size_t serialized_sp_model_proto_len,
    const int** stop_token_ids, const size_t* stop_token_lengths,
    size_t num_stop_lists) {
    fprintf(stderr, "\n[LiteRT-LM WARN] Gemma Constraint Provider is"
                    " STUBBED/DISABLED.\n");
    fprintf(stderr, "[LiteRT-LM WARN] Any requests for grammar-constrained"
                    " decoding will be ignored or fail.\n\n");
    // Return a dummy pointer so that engine creation doesn't fail!
    return new LiteRtLmGemmaModelConstraintProvider{0};
}

void LiteRtLmGemmaModelConstraintProvider_Destroy(void* provider) {
    if (provider) {
        delete static_cast<LiteRtLmGemmaModelConstraintProvider*>(provider);
    }
}

void* LiteRtLmGemmaModelConstraintProvider_CreateConstraintFromTools(
    void* provider, void* tools, void* options) {
    return nullptr;
}
}  // extern "C"
