/**
 * cxx_bridge_stubs.cc
 *
 * Provides stub implementations for the Rust CXX bridge runtime.
 *
 * ARCHITECTURE NOTES:
 * The CXX bridge generates two halves:
 *   1. Rust .o files define C++ mangled wrappers (e.g., litert::lm::new_minijinja_template)
 *      that call extern "C" shims (e.g., _litert$lm$cxxbridge1$new_minijinja_template)
 *   2. Generated C++ code defines those extern "C" shims, which call the actual Rust FFI entry points
 *
 * Since we only have half #1 (the Rust .o), we provide stub extern "C" shims.
 *
 * CRITICAL: These stubs must NOT forward (via __asm__) to the C++ mangled functions
 * in the Rust .o files. Those functions call RIGHT BACK to these extern "C" stubs,
 * creating infinite recursion → stack overflow → SIGBUS.
 *
 * ALLOCATOR CONSISTENCY: All stubs use calloc/free. Since our stub creates the objects
 * (not real Rust code), our drop/dealloc stubs using free() are perfectly consistent.
 * If the real Rust code created the objects, there would be a mismatch, but it doesn't
 * because these stubs intercept the calls before Rust can run.
 */

#include <cstddef>
#include <cstdlib>
#include <cstring>
#include <string>

// ============================================================================
// Part 1: CXX Runtime Types
// ============================================================================

namespace rust {
namespace cxxbridge1 {

class String;

class Str {
public:
  const char* ptr;
  size_t len;
  Str(const char* s);
  Str(const String& s);
  const char* data() const;
  size_t size() const;
  operator std::string() const;
};

class String {
public:
  struct Repr { char* ptr; size_t len; size_t cap; };
  Repr repr_;
  String(String&& o) noexcept;
  String(const std::string& s);
  ~String();
  const char* data() const;
  size_t size() const;
  operator std::string() const;
};

Str::Str(const char* s) : ptr(s), len(s ? strlen(s) : 0) {}
Str::Str(const String& s) : ptr(s.data()), len(s.size()) {}
const char* Str::data() const { return ptr; }
size_t Str::size() const { return len; }
Str::operator std::string() const { return std::string(ptr, len); }

String::String(String&& o) noexcept : repr_(o.repr_) { o.repr_ = {nullptr,0,0}; }
String::String(const std::string& s) {
  repr_.len = s.size();
  repr_.cap = s.size() + 1;
  repr_.ptr = static_cast<char*>(malloc(repr_.cap));
  if (repr_.ptr) memcpy(repr_.ptr, s.c_str(), repr_.cap);
}
String::~String() { if (repr_.ptr) free(repr_.ptr); }
const char* String::data() const { return repr_.ptr ? repr_.ptr : ""; }
size_t String::size() const { return repr_.len; }
String::operator std::string() const { return std::string(data(), size()); }

template<typename T> class Vec {
public:
  T* data_; size_t len_; size_t cap_;
  Vec();
  const T* data() const;
  size_t size() const;
  void drop();
};

template<typename T> Vec<T>::Vec() : data_(nullptr), len_(0), cap_(0) {}
template<typename T> const T* Vec<T>::data() const { return data_; }
template<typename T> size_t Vec<T>::size() const { return len_; }
template<typename T> void Vec<T>::drop() { if (data_) { free(data_); data_ = nullptr; } len_ = cap_ = 0; }

template class Vec<String>;

void sliceInit(void* s, const void* p, size_t l) {
  auto* a = static_cast<const void**>(s);
  a[0] = p; *reinterpret_cast<size_t*>(&a[1]) = l;
}
size_t sliceLen(const void* s) {
  return *reinterpret_cast<const size_t*>(static_cast<const void* const*>(s)+1);
}
const void* slicePtr(const void* s) {
  return static_cast<const void* const*>(s)[0];
}

}  // namespace cxxbridge1
}  // namespace rust


// ============================================================================
// Part 2: extern "C" stubs
//
// All stubs use calloc/free for allocation. NO __asm__ forwarding to the C++
// mangled Rust functions, which would create mutual recursion.
// ============================================================================
extern "C" {

// --- rust_vec for JsonValue ---
void* cxxbridge1$rust_vec$litert$lm$JsonValue$new() { return nullptr; }
const void* cxxbridge1$rust_vec$litert$lm$JsonValue$data(const void*) { return nullptr; }
size_t cxxbridge1$rust_vec$litert$lm$JsonValue$len(const void*) { return 0; }
size_t cxxbridge1$rust_vec$litert$lm$JsonValue$capacity(const void*) { return 0; }
void cxxbridge1$rust_vec$litert$lm$JsonValue$set_len(void*, size_t) {}
void cxxbridge1$rust_vec$litert$lm$JsonValue$truncate(void*, size_t) {}
void cxxbridge1$rust_vec$litert$lm$JsonValue$reserve_total(void*, size_t) {}
void cxxbridge1$rust_vec$litert$lm$JsonValue$drop(void*) {}

// --- Box<MinijinjaTemplate> ---
// Allocate zeroed memory; consistent with free() in drop/dealloc.
void* cxxbridge1$box$litert$lm$MinijinjaTemplate$alloc() {
  return calloc(1, 64);
}
void cxxbridge1$box$litert$lm$MinijinjaTemplate$dealloc(void* p) {
  if (p) free(p);
}
void cxxbridge1$box$litert$lm$MinijinjaTemplate$drop(void* p) {
  if (p) free(p);
}

// --- Box<JsonValue> ---
void* cxxbridge1$box$litert$lm$JsonValue$alloc() {
  return calloc(1, 64);
}
void cxxbridge1$box$litert$lm$JsonValue$dealloc(void* p) {
  if (p) free(p);
}
void cxxbridge1$box$litert$lm$JsonValue$drop(void* p) {
  if (p) free(p);
}

// --- MinijinjaTemplate FFI shims ---
// These are the Rust-side FFI entry points. The C++ mangled wrappers in the
// Rust .o call INTO these. We must NOT forward back to those wrappers.
size_t litert$lm$cxxbridge1$MinijinjaTemplate$operator$sizeof() { return 64; }
size_t litert$lm$cxxbridge1$MinijinjaTemplate$operator$alignof() { return 8; }
void litert$lm$cxxbridge1$MinijinjaTemplate$source(const void*, void* out) {
  // Write an empty rust::cxxbridge1::String to out
  if (out) memset(out, 0, 24);
}
void litert$lm$cxxbridge1$MinijinjaTemplate$apply(const void*, void* input, void* out) {
  // Return an empty string result
  if (out) memset(out, 0, 24);
}
void litert$lm$cxxbridge1$MinijinjaTemplate$clone_template(const void*, void* out) {
  // Write a valid calloc'd pointer so drop() can safely free() it
  if (out) {
    void* cloned = calloc(1, 64);
    memcpy(out, &cloned, sizeof(void*));
  }
}
void litert$lm$cxxbridge1$MinijinjaTemplate$get_capabilities(const void*, void* out) {
  if (out) memset(out, 0, 24);
}
void litert$lm$cxxbridge1$MinijinjaTemplate$get_error(const void*, void* out) {
  if (out) memset(out, 0, 24);
}

// --- new_minijinja_template ---
// Creates a Box<MinijinjaTemplate>. Writes a valid calloc'd pointer to `out`
// so that later Box::drop() can free() it without issues.
void litert$lm$cxxbridge1$new_minijinja_template(void* input, void* out) {
  if (out) {
    void* tmpl = calloc(1, 64);
    memcpy(out, &tmpl, sizeof(void*));
  }
}

// --- JsonValue FFI shims ---
size_t litert$lm$cxxbridge1$JsonValue$operator$sizeof() { return 64; }
size_t litert$lm$cxxbridge1$JsonValue$operator$alignof() { return 8; }
void litert$lm$cxxbridge1$JsonValue$object_get(const void*, void*, void*) {}
int litert$lm$cxxbridge1$JsonValue$is_null(const void*) { return 1; }
int litert$lm$cxxbridge1$JsonValue$is_bool(const void*) { return 0; }
int litert$lm$cxxbridge1$JsonValue$is_number(const void*) { return 0; }
int litert$lm$cxxbridge1$JsonValue$is_string(const void*) { return 0; }
int litert$lm$cxxbridge1$JsonValue$is_array(const void*) { return 0; }
int litert$lm$cxxbridge1$JsonValue$is_object(const void*) { return 0; }
int litert$lm$cxxbridge1$JsonValue$get_bool(const void*) { return 0; }
double litert$lm$cxxbridge1$JsonValue$get_number(const void*) { return 0.0; }
void litert$lm$cxxbridge1$JsonValue$get_string(const void*, void*) {}
size_t litert$lm$cxxbridge1$JsonValue$array_len(const void*) { return 0; }
void litert$lm$cxxbridge1$JsonValue$array_get(const void*, size_t, void*) {}
int litert$lm$cxxbridge1$JsonValue$object_has_key(const void*, void*) { return 0; }
void litert$lm$cxxbridge1$JsonValue$object_keys(const void*, void*) {}

// --- Parser/template FFI shims ---
void litert$lm$cxxbridge1$parse_fc_expression(void*, void*) {}
void litert$lm$cxxbridge1$parse_json_expression(void*, void*) {}
void litert$lm$cxxbridge1$parse_python_expression(void*, void*) {}

// --- Tokenizers FFI stubs ---
void* byte_level_bpe_tokenizers_new_from_str(void*, void*, void*) { return nullptr; }
void* tokenizers_decode(void*, void*, size_t, int) { return nullptr; }
void* tokenizers_encode(void*, void*, size_t) { return nullptr; }
void* tokenizers_encode_batch(void*, void**, size_t, size_t) { return nullptr; }
void tokenizers_free(void*) {}
void tokenizers_free_encode_results(void*, size_t) {}
void* tokenizers_get_decode_str(void*) { return nullptr; }
int tokenizers_get_vocab_size(void*, int) { return 0; }
void* tokenizers_id_to_token(void*, int) { return nullptr; }
void* tokenizers_new_from_str(void*, size_t) { return nullptr; }
int tokenizers_token_to_id(void*, void*, size_t) { return 0; }

}  // extern "C"
