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
            login: "Sign in / sign up",
            sup: "EduID ServiceDesk is by invitation only.",
            logout: "Logout",
            system: "System"
        },
        loginInfo: {
            title: "Inloggen / aanmelden",
            subTitle: "je kunt op SURF Access inloggen met een bestaand instellingsaccount, of als je deze niet met een eduID. Kies hieronder je situatie",
            commercial: {
                title: "Je werkt bij een (commercieel) bedrijf",
                info: [
                    "Maken jullie zelf software die je wilt aanbieden in het onderwijsveld?",
                    "Dan moet je inloggen met eduID. Heb je nog geen account, geen zorgen, het aanmaken van een nieuwe account kan binnen 30 seconden"
                ],
                login: "Login met eduID"
            },
            education: {
                title: "Je werkt bij een instelling",
                info: [
                    "Ben je medewerker, student of onderzoeker bij een instelling die al is aangesloten op SURF, dan kan je direct inloggen met je instellingsaccount."
                ],
                login: "Login met je instellingsaccount"
            }

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
        organizationMaintenance: "Organization maintenance",
        catalogue: "SURF app catalogue",
        yourApps: "Your apps",
        allApps: "All apps",
        users: "User management",
        home: "Home",
        applications: "Applications",
        teams: "Teams"
    },
    breadCrumb: {
        access: "SURF Access",
        landing: "Search for your organization",
        applications: "Application maintenance",
        team: "Team management",
        joins: "Join Requests",
        invitations: "Invitation",
        home: "Home"
    },
    welcome: {
        greeting: "Welcome {{name}}",
        info: "Kies hieronder of jouw organisatie al bestaat of voeg een nieuwe organisatie toe. Dit helpt ons om je aan de juiste omgeving te koppelen.",
        searchPlaceholder: "Search for organizations...",
        organizationMembers: "{{memberCount}} {{user}} and {{applicationCount}} {{application}}. Request access.",
        user: "user",
        users: "users",
        application: "application",
        applications: "applications",
        zeroState: "No organizations found",
        register: "‘<strong>{{name}}</strong>’ registreren en doorgaan",
        flash: "Created organization {{name}}."
    },
    userHome: {
        greeting: "{{name}}",
        nudgeLanding: "You are not a member of any organization.",
        nudgeLandingLink: " You can request to join one or create your own.",
        infoJoinRequest: "Just relax, your request to join the organization <strong>{{name}}</strong> is pending.",
        backToLanding: "Go back to ",
        backToLandingLink: " create your own organization.",
    },
    tabs: {
        users: "Users",
        team: "My Team",
        joins: "Join Requests",
        invitations: "Invitations",
    },
    joinRequest: {
        info: "Je hebt geen toegang tot de omgeving van <strong>{{name}}</strong>. Je kunt toegang vragen aan de beheerder.",
        optionalMessage: "Message (optional)",
        optionalMessageInfo: "Message included in the join request send to the administrators",
        optionalMessagePlaceHolder: "Please, please...",
        requestAccess: "Request access",
        duplicate: "There is already an outstanding request for you to join <strong>{{name}}</strong>.",
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
    userMenu: {
        switchOrganization: "Switch organization"
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
        },
        flash: "Application {{name}} saved.",
        deleteConfirmation: "Are you sure you want to delete the Application {{name}}?"
    },
    organization: {
        alertInfo: "Welkom op SURF Access. Via deze Self Service Portal kun je jouw Applicatie beschikbaar maken voor instellingen binnen het hoger onderwijs in Nederland.",
        applicationManagement: "Application management",
        addFirstApplication: "Voeg je eerste Applicatie toe",
        addApplication: "Nieuwe Applicatie toevoegen",
        deleteConfirmation: "Are you sure you want to delete the Organization {{name}}?",
        catalog: {
            terms: "Voorwaarden voor apps in de SURF catalogus",
            fairUse: "Is je app voor een specifieke groep gebruikers (zoals één onderzoeksgroep)? Dan valt deze onder de <a href='https://surf.nl/fair-use' target='_blank'>Fair use gebruiksvoorwaarden</a>.",
            agreement: "Is je app bedoeld voor gebruik door hele onderwijsinstellingen? Dan teken je een <a href='https://surf.nl/fair-use' target='_blank'>SURF-aansluitovereenkomst</a>.",
            disclaimer: "<strong>Let op</strong>: Deze voorwaarden gelden alleen voor de productieomgeving, je kunt direct met de testomgeving koppelen."
        },
        applications: "Applications",
    },
    connection: {
        overview: "Overview",
        testing: "Testing",
        prod: "Production",
        application: "App information",
        contract: "Contract",
        appteam: "Appteam",
        welcome: "Welkom {{user}}. {{name}} is nog niet gekoppeld met SURF Access. Begin met een koppeling aan onze testomgeving.",
        testSection: "Test",
        teamSection: "Team",
        duplicatedName: "A connection with name {{name}} already exists for this Application.",
        duplicateEntityID: "A connection with entityID {{entityID}} already exists",
        test: {
            name: "Test",
            connections: "Koppelingen met onze testomgeving",
            info: "Test of federatief inloggen werkt via onze testomgeving.",

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
            disclaimer: "Een koppeling aan de productieomgeving van SURF Access heeft goedkeuring nodig van team SURF Access. Alle bovenstaande informatie is verplicht.",
        },
        productionConnectionHint: "Maak een productiekoppeling aan. Om de applicatie te kunnen activeren, moet ook alle informatie over de dienst worden toegevoegd.",
        applicationInformationHint: "Voordat een productiekoppeling geactiveerd kan worden, moet alle informatie over de dienst zijn toegevoegd én het contract getekend.",
        productionActivationHint: "Vraag activatie van de propductiekoppeling aan.",
        productionActivationAction: "Doe het direct",
        productActivationPending: "De aanvraag voor activatie van uw productiekoppeling is ontvangen. SURF neemt binnen drie werkdagen contact met u op.",
        newConnection: "Nieuwe koppeling met de testomgeving",
        existingConnection: "Testkoppeling bewerken",
        newConnectionProd: "Nieuwe koppeling met de productieomgeving",
        existingConnectionProd: "Productiekoppeling bewerken",
        copyConnection: "Kopieer info van andere koppeling",
        technical: "Technische gegevens",
        informationProfile: "Informatieprofiel",
        testIdP: "Test-IdP's",
        visibility: "Zichtbaarheid in de SURF app catalogus",
        help: "Hulp nodig?",
        callSurf: "Plan een call met SURF",
        mailToSurf: "mailto:surf@info.nl",
        connectionName: "Naam koppeling",
        connectionPlaceholder: "e.g. {{application}}-{{environment}}",
        protocol: "Protocol",
        protocolTooltip: "When a connection is registered within SURFconext, it is no longer possible to change the protocol. If you want, you can delete this connection and create another with a different protocol.",
        clientID: "Client ID",
        clientIDPlaceHolder: "",
        oidc10_rp: "OpenID Connect",
        saml20_sp: "SAML 2.0",
        grantType: "OAuth Grant type",
        grantTypes: "OAuth Grant types",
        authorization_code: "Authorization Code",
        refresh_token: "Refresh tokens",
        device_code: "Device Code",
        pkce: "PKCE",
        pkceTooltip: "PKCE (Proof Key for Code Exchange) enhances the security of the authorization code flow by preventing authorization code interception. It’s especially important for public clients like mobile or single-page apps",
        optional: "Optional",
        required: "Required (public client)",
        refreshTokenValidity: "Validity in seconds",
        redirectUrl: "Redirect URL",
        redirectUrls: "Redirect URLs",
        redirectUrlsPlaceholder: "Redirect URL, for example https://redirect.com",
        addRedirectUrl: "+ Redirect URL",
        sslGrade: "SSL Grade (min. B)",
        sslGradeTooltip: "Ensure the SSL/TLS certificate meets or exceeds grade B",
        claimsInIdToken: "Claims",
        claimsInIdTokenTooltip: "Receive all claims directly in the ID Token",
        configuration: "Congifuratiegegevens",
        import: "Metadata importeren",
        entityID: "Entity ID",
        entityIDPlaceHolder: "https://entityID.com",
        acsLocation: "ACS location",
        acsLocations: "ACS location(s)",
        addACSLocation: "+ Add ASC location",
        save: "Opslaan",
        saveAndNext: "Opslaan en volgende",
        deleteConfirmation: "Are you sure you want to delete this connection?",
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
        flash: {
            created: "Created connection {{name}}",
            updated: "Updated connection {{name}}",
            deleted: "Deleted connection {{name}}",
            copied: "Copied connection data from {{name}}"
        },
        connections: {
            titleProd: "Koppelingen met de productieomgeving",
            titleTest: "Koppelingen met de testomgeving",
            name: "Name",
            created: "Added at",
            updatedAt: "Updated at",
            status: "Status",
            open: "Open",
            complete: "Completed",
            pending_prod: "Pending production",
            prod_ready: "Production ready",
            tooltips: {
                //A null tooltip won't show
                open: "Your connection has unfinished sections. Please fill in all the required fields.",
                complete: null,
                pending_prod: "Je productieverzoek ligt ter inzage bij <strong>SURF Access</strong>. Eén van onze medewerkers beoordeelt nu de configuratie en laat zo snel mogelijk weten of deze akkoord is.<br><br> Na publicatie kunnen instellingen aan je applicatie koppelen.",
                prod_ready: "Je applicatie is klaar voor productie en instellingen kunnen aan je applicatie koppelen.",
            },
            protocol: "Protocol",
            details: "Details",
            requestProductionStatus: "Vraag productiestatus aan",
            requestProductionStatusConfirmation: "Are you sure you want to request production status for {{name}}",
            requestProductionStatusPostInfo: "Your request is sent and you will be contacted by mail within <strong>3 working days</strong>. Your reference number of our internal ticketing system is <strong>{{jiraKey}}</strong></strong>"
        },
        informational: {
            disclaimer: "Verwerk alleen informatie die <strong>strikt noodzakelijk</strong> is voor het functioneren van je applicatie.",
            contentAppAlert: "Een content application ontvangt de volgend informatie",
            profiles: {
                anonymous: {
                    name: "Anoniem",
                    title: "Het meest privacyvriendelijk",
                    info: "Deze bundel is speciaal bedoeld voor als je zeer privacy bewust wilt werken. Je ontvangt een transient NameID, dit betekent dat de gebruiker elke keer als hij bij de dienst inlogt een nieuw etcetera."
                },
                pseudonymized: {
                    name: "Pseudonymized",
                    title: "Privacy vriendelijk inclusief betrouwbaarheid",
                    info: "Deze bundel is speciaal bedoeld voor toelichting. Je ontvangt een persistent NameID, dit betekent dat de toelichting gebruiker elke keer als hij bij de dienst inlogt etcetera."
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
            attributes: "<strong>Je ontvangt de volgende attributen</strong> (we tonen voorbeeldwaarden)",
            additionalAttributes: "Ik heb additionele attributen nodig",
            availableAttributes: "De volgende attributen zijn mogelijk bij deze bundel",
            profileMotivation: "Motivatie voor de noodzaak van dit profiel",
            profileMotivationPlaceholder: "Beschrijf waarom je dit informatieprofiel nodig hebt",
            profileMotivationDisclaimer: "Deze tekst wordt getoond aan eindgebruikers die willen aansluiten bij je dienst",
            motivation: "Motivation",
            motivationPlaceholder: "Attribute is used to ..."
        },
        testIdPs: {
            info: "Kies met welke IdP’s je wilt testen of het federatief inloggen werkt.",
            subTitle: "Test-IdP’s van SURF",
            identityProviders: [
                {
                    name: "SXS IdP",
                    entityid: "http://mock-idp",
                    description: "Een test-IdP met <a href='https://idp.diy.surfconext.nl/showusers.php' target='_blank'>fictieve gebruikersaccounts</a>. De metadata vind je <a href='https://idp.diy.surfconext.nl/saml2/idp/metadata.php' target='_blank'>hier</a>"
                },
                {
                    name: "SXS Dummy",
                    entityid: "https://idp.diy.surfconext.nl/saml2/idp/metadata.php",
                    description: "Een test-IdP waarmee je zelf attributen-sets kunt simuleren. De metadata vind je <a href='https://mujina-idp.test.surfconext.nl/metadata' target='_blank'>hier</a>"
                }
            ],
            institutionIdPs: "Test-IdP’s van instellingen",
            institutionIdPsInfo: "Je kunt ook testen met accounts en data van instellingen. <strong>Let wel op<strong/>: Je moet zelf contact opnemen voor de test-inloggegevens voor hun test-IdP’s.",
            placeholder: "Selecteer één of meerdere instellingen",
            institution: "test IdP or institution IdP"
        },
        visibilities: {
            info: "Jouw app is straks zichtbaar in de SURF app catalogus. Instellingen of groepen die jouw applicatie willen gebruiken, kunnen deze zelf activeren of een koppeling aanvragen.",
            disclaimer: "<strong>Let op</strong>: je kan de zichtbaarheid altijd later nog aanpassen",
            who: "1. Wie mogen jouw applicatie zien?",
            visible_to_all: "Alle organisaties",
            visible_to_none: "Nog niemand (app is nog niet zichtbaar in de Appstore)",
            connect: "2. Kan men direct met de applicatie koppelen?",
            connect_with_interaction: "Yes",
            connect_without_interaction_with_email: "Nee, een koppeling moet worden aangevraagd",
            placeholder: "Selecteer één of meerdere instellingen",
            institution: "Institution IdP"
        },
        connectionOverview: {
            copy: "Kopieer de inloggegevens",
            disclaimer: "Het client secret wordt hieronder éénmaal weergegeven. Zorg ervoor dat je het nu kopieert, anders moet er een nieuw seceret aangevraagd worden.",
            test: "Gebruik de volgende inloggegevens om verbinding te maken met de productieomgeving. Volg de <a href='https://servicedesk.surf.nl/wiki/spaces/IAM/pages/128909810/SURFconext+for+Service+Providers' target='_blank'>testinstructies</a> om te kijken of alles werkt.",
            discovery: "OpenID Connect Discovery",
            clientID: "Client ID",
            secret: "Client secret",
            authentication: "Authenticatie",
            secretReset: "For security reasons your current secret can not be displayed.",
            secretResetLink: "Reset your secret when needed.",
            secretResetDisclaimer: "Let op. Regenerating the secret will break your current connection.",
            secretResetTitle: "Reset your secret",
            secretResetNew: "New secret",
            reset: "Reset my secret",
            resetContinue: "I’ve copied the secret. Continue"
        },
        connectionOverviewSAML: {
            title: "De SAML koppeling is gereed",
            link: "Volg de <a href='https://servicedesk.surf.nl/wiki/spaces/IAM/pages/128910223/Connect+to+the+test+environment' target='_blank'>testinstructies</a> om te kijken of alles werkt."
        },
        appInfo: {
            title: "App informatie voor de SURF App catalogus",
            label: "App informatie",
            sections: {
                logo: "Logo en beschrijving",
                contact: "Contactgegevens",
                privacy: "Privacy & Security ",
                overview: "Overview"
            },
            logoUrl: "Logo",
            descriptionEn: "Beschrijving in het Engels",
            descriptionNl: "Beschrijving in het Nederlands",
            webSite: "Website",
            tags: "Tag je applicatie",
            tagPlaceholder: "Maximaal 3 tags",
            tagInfo: "In de appstore kunnen instellingen hierop filteren",
            tagsAvailable: {
                education: "Education",
                research: "Research",
                privacy: "Privacy/security",
                content: "Content/library",
                repository: " Repository",
                company: "Business management",
                recommended: "Suggested",
                productivity: "Productivity",
                organization: "Management of education/research",
                cooperation: "Collaborate",
                video: "Video platform",
                surf: "SURF"
            },
            targetGroup: "Ga door naar de doelgroep"
        },
        logo: {
            name: "logo",
            add: "Add a logo",
            edit: "Change logo",
            imageToLarge: "Image is larger then 2MB.",
            confirm: "Set new logo image",
            header: "Crop your new logo image",
            disclaimers: [
                "png, jpg, svg or gif",
                "min 100 * 100 pixels",
                "max 2MB.",
            ]
        },
        contacts: {
            label: "Contactgegevens",
            info: "Gebruik zoveel mogelijk functionele adressen in plaats van persoonlijke.",
            name: "name",
            administrative: "Administratief contact",
            administrativeTooltip: "Administratief contact Tooltip",
            administrativePlaceholder: "e.g. admin@{{name}}",
            emailOrWebsite: "Email-adres of website",
            technical: "Technisch contact (anders dan administratief)",
            technicalTooltip: "Technical contact Tooltip",
            technicalPlaceholder: "e.g. technical@{{name}}",
            support: "Support contact (eindgebruikers zien dit)",
            supportTooltip: "Support contact Tooltip",
            supportPlaceholder: "e.g. support@{{name}}",
        },
        privacy: {
            label: "Privacy & Security",
            info: "Please fill out the questions below. We will share the answers with institutions connected to SURFconext. This way the institutions interested in your service quickly have an idea of your efforts regarding privacy and security.",
            answerIsRequired: "Answer to this privacy question is required"
        },
        appOverview: {
            label: "De App informatie zijn compleet.",
            info: "Zo verschijnt je app in de SURF App catalogus.",
        },
        contractSection: {
            title: "Contract",
            info: "Voor apps op SURF Access moet je een SURF-aansluitovereenkomst tekenen.",
            notSigned: "Er is nog geen overeenkomst getekend.",
            signed: "Er is een overeenkomst getekend.",
            sign: "Teken de overeenkomst"
        }
    },
    testing: {
        newConnection: "New connection",
        added: "Added at",
        status: "Status",
        protocol: "Protocol",
        details: "Details",
        zeroState: "Application <strong>{{name}}</strong> has no {{type}} connections yet.",
        production: "production",
        test: "test"
    },
    confirmationDialog: {
        title: "Confirm",
        error: "Error",
        subTitle: "This action requires a confirmation",
        subTitleError: "An error has occurred",
        confirm: "Confirm",
        ok: "Ok",
        cancel: "Cancel",
    },
    userManagement: {
        title: "Gebruikersbeheer"
    },
    teamManagement: {
        nameEmail: "Name & Email",
        applicationMemberships: "Member of ApplicationTeams",
        active: "Active since",
        role: "Role",
        maintain: "Maintain the {{name}} team",
        searchPlaceHolder: "Search for members",
        new: "Invite team member",
        deleteConfirmation: "Are you sure you want to remove the organization membership of {{name}}?",
        deleteDemotion: "Are you sure you don't want to be admin anymore? This can not be reverted",
        flash: {
            deleted: "The organization membership of {{name}} has been removed",
            updated: "The organization membership of {{name}} has been updated"
        },
        makeAdmin: "Make admin",
        makeMember: "Make member",
        makeGuest: "Make guest",
        explanations: {
            title: "Toelichting SXS rollen",
            admin: "Admin",
            adminRights: "Admins kunnen alle functies van SXS bedienen en members en guests beheren.",
            member: "Member",
            memberRights: "Members horen bij de organsatie en mogen applicatie beheren en applicatie gebruikers uitnodigen.",
            guest: "Guest",
            guestRights: "Gasten zijn gebruikers die niet bij de organisatie horen maar externen die betrokken zijn om bepaalde applicaties te beheren."
        }
    },
    joinRequestManagement: {
        nameEmail: "Name & Email",
        message: "Personal message",
        createdAt: "Created at",
        maintain: "Maintain the {{name}} join requests",
        zeroState: "There are no outstanding join requests for {{name}}",
        searchPlaceHolder: "Search for join requests",
        approveConfirmation: "Are you sure you want to approve the organization join request of {{name}}?",
        denialConfirmation: "Are you sure you want to deny the organization join request of {{name}}?",
        flash: {
            approved: "The organization membership of {{name}} has been created.",
            approveAll: "The organization memberships habe been created.",
            denied: "The join request of {{name}} has been denied."
        },
        deny: "Deny",
        approve: "Approve",
        approveAll: "Approve all",
        approveAllConfirmation: "Are you sure you want to approve all the organization join requests?"
    },
    invitationsManagement: {
        email: "Email",
        active: "Active since",
        role: "Role",
        createdAt: "Send at",
        expiryDate: "Expires on",
        inviter: "Inviter",
        maintain: "Open invitations",
        searchPlaceHolder: "Search for members",
        zeroState: "There are no outstanding invitations for {{name}}",
        new: "Invite team member",
        deleteAll: "Delete all",
        deleteConfirmation: "Are you sure you want to revoke the invitation for {{email}}?",
        deleteAllConfirmation: "Are you sure you want to revoke all of the invitations of {{name}}?",
        flashDeleteAll: "All invitations have been deleted",
        flashDelete: "Invitations have been revoked",
        resend: "Resend",
        revoke: "Revoke",
        resendConfirmation: "Are you sure you want to resend the invitation for {{email}}?",
        flashReminderSent: "Reminder mail has been sent"
    },
    appTeamManagement: {
        name: "Name",
        role: "Role",
        createdAt: "Member since",
        maintain: "Applicatieteam",
        searchPlaceHolder: "Search for members",
        zeroState: "There are no application memberships for {{name}} yet",
        new: "Invite new user",
        addPlaceHolder: "Add existing user",
        remove: "Remove from appteam",
        deleteConfirmation: "Are you sure you want to delete the application role for {{name}}?",
        organizationMembersPre: "Je kunt ",
        organizationMembersLink: "organisatiegebruikers",
        organizationMembersPost: " toevoegen aan dit applicatieteam. ",
        flashCreated: "Created application membership for {{name}}",
        createdBy: "Created by {{name}} on {{date}}"
    },
    roles: {
        admin: "Admin",
        member: "Member",
        guest: "Guest",
        all: "Roles - all"
    },
    impersonate: {
        exit: "Stop impersonating",
        impersonator: "You are impersonating <strong>{{name}}</strong>",
        impersonatorTooltip: "You are really <em>{{impersonator}}</em>, but you are impersonating <em>{{currentUser}}</em>.",
        flash: {
            startedImpersonation: "You now impersonate {{name}}.",
            clearedImpersonation: "Cleared your impersonation. You are you again."
        },
    },
    users: {
        name_email: "Name & Email",
        schacHomeOrganization: "Organization",
        createdAt: "Active since",
        lastActivity: "Last activity",
        searchPlaceHolder: "Search users...",
        impersonate: "Impersonate user {{name}}",
        you: "You"
    },
    invitation: {
        title: "New invitation for {{name}} membership",
        invitees: "Invitees",
        intendedAuthority: "Rol",
        message: "Personal note",
        messagePlaceholder: "Add an optional personal note to your invitation",
        inviteesPlaceholder: "Invitee email addresses",
        invite: "Invite",
        invalidEmails: "Invalid email addresses removed: {{emails}}.",
        requiredEmail: "At least one email is required for an invitation",
        intendedAuthorityTooltip: "The authority determines the rights the invitee will be granted on accepting the invitation",
        inviteesTooltip: "Add email addresses separated by comma, space or semi-colon or on seperate lines. You can also paste a csv file with line-separated email addresses.",
        applications: "Applications",
        applicationsPlaceHolder: "Find and add application access for this invitation",
        applicationsTooltip: "You can already add applications to this invitation. The invitees will be granted read and write access to the applications",
        languageTooltip: "Choose the language of the invitation mail",
        createFlash: "Invitations are created and sent to the invitees",
        acceptedFlash: "Invitation is accepted and you are now a member of the {{name}} organization",
        accept: "{{inviter}} has invited you to join organization {{name}}. Press proceed to accept the invitation and checkout the organization",
    },
    institutions: {
        title: "Institutions",
        subTitle: "Browse the institutions currently connected to SURF Access, categorized into education, research and affiliated institutions.",
        category: "Category",
        all: "All categories",
        other: "Other",
        searchPlaceHolder: "Search institutions..."
    },
    applications: {
        title: "Applications",
        subTitle: "Browse applications currently connected to SURF Access, categorized into categories. Some are connected directy via SURFconext, others via eduGAIN..",
        category: "Category",
        all: "All categories",
        allSources: "All federations",
        other: "-",
        searchPlaceHolder: "Search applications..."
    },
    applicationDetail: {
        title: "Applications",
        subTitle: "Browse applications currently connected to SURF Access, categorized into categories. Some are connected directy via SURFconext, others via eduGAIN..",
        back: "Terug",
        license: {
            license_available_through_surfmarket: "Requires a license through SURFmarket",
            license_not_required: "Does not requires a license",
            license_required_by_service_provider: "Requires a license",
        },
        attributes: "Attributes",
        attributesInfo: "The application needs to receive attributes to function correctly.",
        details: "Show details",
        privacy: "Privacy",
        privacyInfo: "SURF asks suppliers to provide information about their GDPR (AVG) policies. For anything missing, please contact the supplier.",
        quickLinks: "Quick links",
        website: "Website",
        loginPage: "Login page",
        support: "Support",
        terms: "Terms & conditions",
        registrationPolicy: "Registration policy",
        privacyStatement: "Privacy statement",
        contractual: "Contractual Base",
        wiki: " See the <a href='https://support.surfconext.nl/contract-info-nl' target='_blank' rel='noopener noreferrer'>wiki</a>.",
        noInformation: "No information supplied",
        contractualInfoOrganization: "(This application is offered by {{name}}.)",
        contractualBase: {
            na: "No info on the contractual base is available: for any questions, please contact <a href='mailto:support@surfconext.nl'>support@surfconext.nl</a>.",
            ao: "{{organisation}} has signed the SURFconext connection agreement.",
            ix: "Application offered by SURFconext member institution.",
            "r&s+coco": "eduGAIN application that has agreed to the Data Protection Code of Conduct and belongs to the Research & Scholarship entity category.",
            entree: "Member of the Kennisnet Entree-federation.",
            clarin: "Member of the Clarin research federation.",
            none: "{{organisation}} refused to sign the SURFconext connection agreement.",
            "edugain (community)": "Application offered through the international research and education community via eduGAIN."
        },
        supportedEntityCategories: "Supported Entity Categories",
        entityCategory: {
            "http://wwwgeantnet/uri/dataprotection-code-of-conduct/v1": "GÉANT Data Protection Code of Conduct",
            "https://refedsorg/category/code-of-conduct/v2": "REFEDS Data Protection Code of Conduct v2",
            "http://refedsorg/category/research-and-scholarship": "Research and Scholarship",
            "http://clarineu/category/clarin-member": "Clarin member",
            "http://refedsorg/category/hide-from-discovery": "Hide from discovery"
        },
        none: "None",
        interfedSource: "Federation source",
        registrationInfo: "This application provider is available in SURFconext through <a href='https://support.surfconext.nl/edugain' target='_blank' rel='noopener noreferrer'>eduGAIN</a>. " +
            "The application provider is registered by the following federation: <a href='{{url}}' target='_blank' rel='noopener noreferrer'>{{url}}</a>.",
        noArp: "This application will receive all attirbutes that are released by the identity provider",
        noMotivation: "No motivation",
        noPrivacyInfo: "No information supplied",
        source: "Source: ",
        arpSources: {
            eduid: "EduID Identity Provider",
            idp: "Your IdP",
            invite: "SURF Invite",
            manage: "SURF Manage",
            orcid: "ORCID organization",
            sabrest: "SURF SAB",
            voot: "SURF Memberships",
            institution: "Your IdP"
        }
    },
    connect: {
        title: "How to connect",
        subTitle: "Connecting to SURF Access is not complicated. It requires a formal and a technical part.",
        formal: "Formal part",
        formalInfo: "Applications on SURF Access are either provided by commercial entities or by SURF members for the benefit of their peers within the network. Our agreements vary based on the ownership of the application and the intended audience. For instance, if you intend to offer your service to a large number of users, you will need to enter into a formal contract with us.  If your service is developed within your institution and is intended for a smaller research group, a shorter terms of service will do.",
        agreementTypes: "Agreement types",
        testIdps: "Test IdP’s",
        collaborations: "Collaborations",
        enterprises: "Enterprises",
        accessTestIdps: "access for test IdP’s",
        accessGroups: "access for diverse groups",
        accessStudent: "e.g. access for all students",
        commercial: "Commercial entity",
        fairUse: "<a href='https://www.surf.nl/en/services/identity-access-management/surfconext' target='_blank'>Fair Use Policy</a>",
        accessTOS: "<a href='https://www.surf.nl/en/services/identity-access-management/surfconext' target='_blank'>SURF Access TOS</a>",
        connectionAgreement: "<a href='https://www.surf.nl/en/services/identity-access-management/surfconext' target='_blank'>Connection agreement</a>",
        surfMember: "SURF member",
        notNeeded: "not needed",
        memberAgreement: "<a href='https://www.surf.nl/en/services/identity-access-management/surfconext' target='_blank'>Member agreement</a>",
        surfMemberInfo: "including affiliated organisations",
        provisions: "With these provisions, we aim to ensure a smooth and secure integration for all parties involved.",
        technical: "Technical part",
        technicalInfo: "Whenever a user logs in through SURF Access, their information flows from their home-institution (Identity provider), via SURF Access, directly to your service.",
        serviceInfo: "Your service can receive a variety of data, including:",
        serviceBullets: [
            "<strong>Authentication Data</strong>: Proof that the user has been authenticated by the Identity Provider.",
            "<strong>Authorisation Information</strong>: Details necessary for making authorisation decisions within your service.",
            "<strong>Group Membership Information</strong>: Data about a user’s group memberships.",
            "<strong>Additional User Data</strong>: Any other data relevant to the service you provide."
        ],
        samlOidc: "SAML & OpenID Connect",
        samlOidcInfo: "We use these open standards as they are used in most countries and many sectors.",
        attributes: "Attributes and claims",
        attributesInfo: "Learn more about use these open standards as they are used in most countries and many sectors.",
        connect: "Connect your application now"
    },
    forms: {
        cancel: "Cancel",
        submit: "Submit",
        sure: "I'm sure",
        edit: "Edit",
        accept: "Accept",
        proceed: "Proceed",
        delete: "Delete",
        back: "Back",
        required: "{{name}} is required",
        requiredOne: "At least one {{name}} is required",
        error: "An unexpected error occurred",
        backToConnections: "Back to connections",
        backToOverview: "Back to overview",
        overview: "Naar overzicht",
        invalidURL: "{{name}} is not a valid URL",
        invalidEmailURL: "{{name}} is not a valid URL or valid email",
        moreLabel: "Show me more",
        lessLabel: "Show me less",
        you: "You",
        copied: "Copied"
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
