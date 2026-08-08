export type ModeApercu = 'pdf' | 'image' | 'indisponible';

const EXTENSIONS_IMAGE = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

/** Détermine comment prévisualiser un fichier (côté dépôt comme côté consultation admin),
 * à partir de son type MIME si connu, sinon de l'extension de son nom — pour rester
 * fiable même quand un navigateur ne renseigne pas correctement `File.type`. */
export function resolveApercuMode(typeMime: string | null | undefined, nomFichier: string | null | undefined): ModeApercu {
    if (typeMime === 'application/pdf') {
        return 'pdf';
    }
    if (typeMime?.startsWith('image/')) {
        return 'image';
    }
    const extension = extraireExtension(nomFichier);
    if (extension === 'pdf') {
        return 'pdf';
    }
    if (EXTENSIONS_IMAGE.includes(extension)) {
        return 'image';
    }
    return 'indisponible';
}

export function extraireExtension(nomFichier: string | null | undefined): string {
    if (!nomFichier) {
        return '';
    }
    const point = nomFichier.lastIndexOf('.');
    return point >= 0 && point < nomFichier.length - 1 ? nomFichier.substring(point + 1).toLowerCase() : '';
}

/** Formate une taille en octets en texte lisible (Ko/Mo), même logique partout dans l'app. */
export function formaterTaille(octets: number | null | undefined): string {
    if (octets === null || octets === undefined) {
        return '';
    }
    if (octets < 1024) {
        return `${octets} o`;
    }
    if (octets < 1024 * 1024) {
        return `${(octets / 1024).toFixed(0)} Ko`;
    }
    return `${(octets / (1024 * 1024)).toFixed(1)} Mo`;
}
