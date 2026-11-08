// An account's profile icon from Data Dragon (the icons are not in the local database).
import { useGameData } from '../../database/index.ts';

export function ProfileIcon({ id, size = '' }: { id: number | null | undefined; size?: '' | 'sm' | 'lg' }) {
  const data = useGameData();
  const v = data.meta ? data.meta.version : null;
  return (
    <div className={`profile-icon ${size}`}>
      {id && v ? <img src={`https://ddragon.leagueoflegends.com/cdn/${v}/img/profileicon/${id}.png`} alt="" /> : null}
    </div>
  );
}
