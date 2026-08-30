// Icône de jeu : texture PNG (chemin commençant par /) ou emoji.
// Rendu pixelisé pour les textures, style Minecraft.
export default function GameIcon({ icon, alt = '', className = '' }) {
  if (icon && icon.startsWith('/')) {
    return (
      <img
        src={icon}
        alt={alt}
        draggable={false}
        className={`pixelated inline-block object-contain align-middle ${className}`}
      />
    );
  }
  return <span className={`inline-block align-middle ${className}`}>{icon}</span>;
}
