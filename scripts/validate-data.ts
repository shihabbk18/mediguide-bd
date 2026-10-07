import { products,guidance,sources,coveredProducts } from '../src/catalogue';
console.log(JSON.stringify({products:products.length,guidance_records:guidance.length,sources:sources.length,products_with_guidance:coveredProducts,products_abstaining:products.length-coveredProducts},null,2));
