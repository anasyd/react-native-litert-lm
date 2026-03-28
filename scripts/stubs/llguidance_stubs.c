/**
 * llguidance_stubs.c
 *
 * Stub implementations for the llguidance C API used by LiteRT-LM's
 * constrained decoding subsystem (llg_constraint, llg_constraint_provider).
 * The real implementation is a Rust library (llguidance) which is not
 * available in the iOS Bazel build.
 *
 * These stubs return error/null values so that constrained decoding
 * gracefully fails at runtime. Basic LLM inference is unaffected.
 */

#include <stddef.h>
#include <stdint.h>

/* Opaque types */
typedef struct LlgTokenizer LlgTokenizer;
typedef struct LlgConstraint LlgConstraint;
typedef struct LlgConstraintInit LlgConstraintInit;

/* llg_new_tokenizer: create a tokenizer handle */
int llg_new_tokenizer(void* init, void** out_tokenizer) {
    if (out_tokenizer) *out_tokenizer = NULL;
    return -1; /* error */
}

/* llg_free_tokenizer: release tokenizer */
void llg_free_tokenizer(void* tokenizer) {
    (void)tokenizer;
}

/* llg_constraint_init_set_defaults: initialize constraint config */
void llg_constraint_init_set_defaults(void* init, void* tokenizer) {
    (void)init;
    (void)tokenizer;
}

/* llg_new_constraint: create grammar constraint */
void* llg_new_constraint(void* init, void* grammar) {
    (void)init;
    (void)grammar;
    return NULL;
}

/* llg_new_constraint_json: create JSON schema constraint */
void* llg_new_constraint_json(void* init, const char* json_schema) {
    (void)init;
    (void)json_schema;
    return NULL;
}

/* llg_new_constraint_regex: create regex constraint */
void* llg_new_constraint_regex(void* init, const char* regex) {
    (void)init;
    (void)regex;
    return NULL;
}

/* llg_new_constraint_lark: create Lark grammar constraint */
void* llg_new_constraint_lark(void* init, const char* lark_grammar) {
    (void)init;
    (void)lark_grammar;
    return NULL;
}

/* llg_clone_constraint: duplicate a constraint */
void* llg_clone_constraint(void* constraint) {
    (void)constraint;
    return NULL;
}

/* llg_compute_mask: compute next token mask */
int llg_compute_mask(void* constraint, void* result) {
    (void)constraint;
    (void)result;
    return -1; /* error */
}

/* llg_commit_token: commit selected token */
int llg_commit_token(void* constraint, int32_t token) {
    (void)constraint;
    (void)token;
    return -1; /* error */
}

/* llg_is_stopped: check if constraint reached accepting state */
int llg_is_stopped(void* constraint) {
    (void)constraint;
    return 1; /* stopped (nothing to do) */
}

/* llg_get_error: get last error message */
const char* llg_get_error(void* constraint) {
    (void)constraint;
    return "llguidance not available on iOS";
}

/* llg_free_constraint: release constraint */
void llg_free_constraint(void* constraint) {
    (void)constraint;
}
