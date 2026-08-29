import { StaticImage } from "cstd-next/media/image/static-image.jsx";

import logo from "@/app/_assets/showteam-logo.svg";
import monkey from "@/app/_assets/showteam-monkey.svg";

export function ShowteamLogo() {
	return <StaticImage className="showteam-admin-logo" src={logo} alt="SHOWteam" loading="eager" sizes="220px" />;
}

export function ShowteamIcon() {
	return (
		<span className="showteam-admin-icon">
			<StaticImage src={monkey} alt="" loading="lazy" sizes="40px" />
		</span>
	);
}

export function LoginIntro() {
	return (
		<div className="showteam-login-intro">
			<strong>Panel SHOWteam</strong>
			<p>Zaloguj się, aby zmieniać ofertę, sprzęt, galerię i rezerwacje.</p>
		</div>
	);
}
