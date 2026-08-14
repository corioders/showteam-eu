import Image from "next/image";

export function ShowteamLogo() {
  return <Image className="showteam-admin-logo" src="/media/showteam-logo.svg" alt="SHOWteam" width={1022} height={241} priority />;
}

export function ShowteamIcon() {
  return <span className="showteam-admin-icon"><Image src="/media/showteam-monkey.svg" alt="" width={40} height={39} /></span>;
}

export function LoginIntro() {
  return <div className="showteam-login-intro"><strong>Panel SHOWteam</strong><p>Zaloguj się, aby zmieniać sprzęt, wydarzenia, galerię i rezerwacje.</p></div>;
}
