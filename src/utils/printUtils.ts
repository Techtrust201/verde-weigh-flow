// Fonction utilitaire pour déboguer les problèmes d'impression
export const debugPrintContent = (content: string) => {
  console.log('🖨️ Debug Print Content:');
  console.log('Content length:', content.length);
  console.log('Contains BDV:', content.includes('BDV'));
  console.log('Contains BON DE:', content.includes('BON DE'));
  console.log('Contains FACTURE:', content.includes('FACTURE'));
  console.log('First 200 chars:', content.substring(0, 200));
  
  // Vérifier si le contenu contient des styles
  const hasStyles = content.includes('<style>') || content.includes('class=');
  console.log('Has styling:', hasStyles);
  
  return content;
};