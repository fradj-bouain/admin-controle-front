/** Extrait un aperçu texte brut d'un contenu HTML (ex: corps de message riche),
 * pour les endroits où on ne peut/veut pas rendre le HTML (listes, aperçus
 * compacts) — sans quoi les balises s'affichent telles quelles à l'écran. */
export function stripHtml(html: string | null | undefined): string {
    if (!html) {
        return '';
    }
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
