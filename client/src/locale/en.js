const en = {
    code: "EN",
    name: "English",
    languages: {
        language: "Language",
        en: "English",
        nl: "Dutch",
    },
    landing: {
        header: {
            title: "SURF Access",
            subTitle: "Enabling users in secondary vocational-, higher education and research <strong>to access multiple services with one account</strong>.",
            login: "Come on in",
            sup: "EduID ServiceDesk is by invitation only.",
            logout: "Logout"
        },
        tabs: {
            home: "Home",
            connect: "How to connect",
            institutions: "All institutions",
            applications: "All applications",

        },
        applicationProviders: {
            title: "For application providers",
            info: [
                "Has an educational or research institution asked you to join SURF Access?",
                "SURF Access centrally manages authentication, authorization, group management, and privacy/security agreements.",
                "Connecting to our SURF Access is free and you wil start in a sandbox."
            ],
            connect: "How to connect"
        },
        institutions: {
            title: "For institutions",
            info: [
                "Do you want your students, staff and researchers to easily access multiple cloud services?",
                "SURF Access offers 'Single Sign On'-access to a large and increasing number of them.",
                "It simplifies your work with a single integration instead of separate connections for each service."
            ],
            contact: "Contact us",
            contactMail: "mailto:info@surfconext.nl"
        },
        joining: {
            title: "Joining many to many",
            info: [
                "SURF Access securily connects 1M+ users to over 3000 (web)applications. SURF Access is a service from <a target='_blank' href='https://surfnet.nl'>SURF</a>.",
                "Interested which institutions and applications are connected?"
            ],
            links: {
                prefix: "Browse ",
                institutions: "all {{nbr}} institutions",
                or: " or ",
                applications: "all {{nbr}} applications.",
            }
        }
    },
    navigation: {
        home: "Home",
        applications: "Applications",
        teams: "Teams"
    },
    breadCrumb: {
        access: "SURF Access",
        landing: "Search for your organization",
        applications: "Application maintenance",
        home: "Home"
    },
    welcome: {
        greeting: "Welcome {{name}}",
        info: "Kies hieronder of jouw organisatie al bestaat of voeg een nieuwe organisatie toe. Dit helpt ons om je aan de juiste omgeving te koppelen.",
        searchPlaceholder: "Search for organizations...",
        organizationMembers: "{{nbr}} users. Request access.",
        zeroState: "No organizations found",
        register: "‘<strong>{{name}}</strong>’ registreren en doorgaan",
        flash: "Created organization {{name}}."
    },
    userHome: {
        greeting: "{{name}}",
        nudgeLanding: "You are not a member of any organization.",
        nudgeLandingLink: " You can request to join one.",
        infoJoinRequest: "Just relax, your request to join the organization <strong>{{name}}</strong> is pending."
    },
    joinRequest: {
        info: "Jouw eduID heeft geen toegang tot de omgeving van <strong>{{name}}</strong>. Je kunt toegang vragen aan de beheerder.",
        requestAccess: "Request access",
        duplicate:"There is already an outstanding request for you to join <strong>{{name}}</strong>.",
        flash: "Your join request is sent to the admins of <strong>{{name}}</strong>.",
        modal: {
            title: "Join request is created",
            success: "Your join request is sent to the admins of <strong>{{name}}</strong>. You will receive an email if the join request is accepted",
            proceed: "Proceed"
        }
    },
    organizations: {
        tooltip: "SURF beoordeelt je organisastie registratie. Je kunt apps registreren op onze testomgeving, voor toegang naar productie moet je ‘bevestigd’ zijn."
    },
    application: {
        new: "New Application",
        edit: "Edit {{name}}",
        name: "Name",
        nameInfo: "Gebruik een naam die herkenbaar zal zijn voor instellingen",
        type: "Type",
        app: "Een Applicatie (tools, clouddiensten, utitilities etc...)",
        content: "Content dienst (streaming media, educatieve content, e-books)",
        contentInfoPre: "Content diensten ontvangen de ",
        contentInfoLink: "minimale set",
        contentInfoPost: " aan attributen.",
        contentInfoTip: "Attributenset voor content providers:<ul><li>Persistent or Transient NameID</li><li>schacHomeOrganization</li>" +
            "<li>eduPersonAffiliation</li><li>eduPersonScopedAffiliation</li></ul>",
        targetGroup: "Target group",
        targetSURF: "Verschillende gebruikers die beheerd worden in een (onderzoeks)groep",
        targetSURFInfo: "De gebruikers worden individueel uitgenodigd bij de groep.",
        targetSRAM: "Studenten, medewerkers en externen uit één instellings IdP",
        targetSRAMInfo: "Zij krijgen toegang omdat ze een kenmerk of rol hebben.",
        terms: "Fair Use terms",
        checks: {
            personal: "Mijn applicatie slaat persoonsgegevens veilig op",
            duration: "Ik bewaar de persoonsgegevens niet langer dan nodig",
            privacy: "Ik verstrek de persoonsgegevens niet aan derden",
            safe: "Ik houd mijn applicatie veilig en beschikbaar",
            support: "Ik ben bereikbaar bij vragen en problemen"
        },
        checksInfo: {
            personal: "De persoonsgegevens worden op een beveiligde manier opgeslagen.",
            duration: "De persoonsgegevens worden echt niet langer dan nodig opgeslagen",
            privacy: "De persoonsgegevens worden niet aan derden verstrekt",
            safe: "De applicatie is uitermate veilig en bijna altijd beschikbaar",
            support: "Als er vragen of problemen zijn, dan zoek je het maar uit"
        }
    },
    organization: {
        alertInfo: "Welkom op SURF Access. Via deze Self Service Portal kun je jouw Applicatie beschikbaar maken voor instellingen binnen het hoger onderwijs in Nederland.",
        applications: "Applicatiebeheer",
        addApplication: "Voeg je eerste Applicatie toe",
        catalog: {
            terms: "Voorwaarden voor apps in de SURF catalogus",
            fairUse: "Is je app voor een specifieke groep gebruikers (zoals één onderzoeksgroep)? Dan valt deze onder de <a href='https://surf.nl/fair-use' target='_blank'>Fair use gebruiksvoorwaarden</a>.",
            agreement: "Is je app bedoeld voor gebruik door hele onderwijsinstellingen? Dan teken je een <a href='https://surf.nl/fair-use' target='_blank'>SURF-aansluitovereenkomst</a>.",
            disclaimer: "<strong>Let op</strong>: Deze voorwaarden gelden alleen voor de productieomgeving, je kunt direct met de testomgeving koppelen."
        }
    },
    connection: {
        overview: "Overview",
        testing: "Testing",
        prod: "Production",
        application: "App information",
        contract: "Contract",
        welcome: "Welkom {{user}}. {{name}} is nog niet gekoppeld met SURF Access. Begin met een koppeling aan onze testomgeving.",
        testSection: "Test",
        teamSection: "Team",
        test: {
            name: "Test",
            connections: "Koppelingen met onze testomgeving",
            info: "Test of federatief inloggen werkt via onze testomgeving."
        },
        team: {
            name: "Teams",
            info: "Geef teamleden of externen toegang tot deze applicatie space.",
            members: "Teamleden voor beheer van deze applicatie"
        },
        production: {
            name: "Production",
            connections: "Koppelingen met onze productieomgeving",
            catalogue: "App informatie voor de SURF App catalogus",
            access: "Toegang en zichtbaarheid",
            contract: "Contract",
            disclaimer: "Een koppeling aan de productieomgeving van SURF Access heeft goedkeuring nodig van team SURF Access. Alle boventaande informatie is verplicht.",
        },
        newConnection: "Nieuwe koppeling met de testomgeving",
        copyConnection: "Kopieer info van andere koppeling",
        technical: "Technische gegevens",
        informationProfile: "Informatieprofiel",
        testIdP: "Test-IdP's",
        help: "Hulp nodig?",
        callSurf: "Plan een call met SURF",
        mailToSurf: "mailto:surf@info.nl",
        connectionName: "Naam koppeling",
        connectionPlaceholder: "e.g. {{application}}-{{environment}}",
        protocol: "Protocol",
        oidc10rp: "OpenID Connect",
        saml20sp: "SAML 2.0",
        grantTypes: "OAuth Grant types",
        authorization_code: "Authorization Code",
        refresh_token: "Refresh tokens",
        device_code: "Device Code",
        pkce: "PKCE",
        pkceTooltip: "PKCE (Proof Key for Code Exchange) enhances the security of the authorization code flow by preventing authorization code interception. It’s especially important for public clients like mobile or single-page apps",
        optional: "Optional",
        required: "Required (public client)",
        redirectUrls: "Redirect URLs",
        addRedirectUrl: "+ Redirect URL",
        sslGrade: "SSL Grade (min. B)",
        sslGradeTooltip: "Ensure the SSL/TLS certificate meets or exceeds grade B",
        configuration: "Congifuratiegegevens",
        import: "Metadata importeren",
        entityID: "Entity ID",
        entityIDPlaceHolder: "https://entityID.com",
        acsLocations: "ACS location(s)",
        addACSLocation: "+ Add ASC location",
        informationProfileInfo: "Verwerk alleen informatie die <strong>strikt noodzakelijk</strong> is voor het functioneren van je applicatie.",
        next: "Opslaan en volgende",
        metadata: {
            how: "Hoe wil je de metadata importeren?",
            url: "De URL van een metadata-bestand opgeven",
            file: "Een metadata-bestand uploaden",
            paste: "De metadata in een tekstveld plakken",
            urlMetaData: "URL metadata bestand",
            import: "Metadata importeren",
            chooseFile: "Choose file",
            doPaste: "Plak hier de metadata",
            parsed: "The metadata has successfully been imported",
            errorParsed: "Error in parsing the metadata"
        },
        informational: {
            disclaimer: "Verwerk alleen informatie die <strong>strikt noodzakelijk</strong> is voor het functioneren van je applicatie.",
            profiles: {
                anonymous: {
                    name:"Anoniem",
                    title: "Het meest privacyvriendelijk",
                    info:"Deze bundel is speciaal bedoeld voor als je zeer privacy bewust wilt werken. Je ontvangt een transient NameID, dit betekent dat de gebruiker elke keer als hij bij de dienst inlogt een nieuw etcetera."
                },
                pseudonymized: {
                    name:"Pseudonymized",
                    title: "Privacy vriendelijk inclusief betrouwbaarheid",
                    info:"Deze bundel is speciaal bedoeld voor toelichting. Je ontvangt een persistent NameID, dit betekent dat de toelichting gebruiker elke keer als hij bij de dienst inlogt etcetera."
                },
                personalized: {
                    name: "Gepersonaliseerd",
                    title: "Persoonlijke gegevens ter identificatie",
                    info: ""
                },
                uidOnly: {
                    name: "UID only",
                    title: "Voor instellingen die intern alle persoonsinformatie aanvullen",
                    info: ""
                }
            },
            attributes      : "Je ontvangt de volgende attributen (we tonen voorbeeldwaarden)",
        }

    },
    forms: {
        cancel: "Cancel",
        submit: "Submit",
        edit: "Edit",
        delete: "Delete",
        back: "Back"
    },
    footer: {
        terms: "Terms of Use",
        termsLink: "https://support.surfconext.nl/terms-en",
        privacy: "Privacy policy",
        privacyLink: "https://support.surfconext.nl/privacy-en",
        surfLink: "https://surf.nl",
        select_locale: "Select your preferred language"
    },

}

export default en;
