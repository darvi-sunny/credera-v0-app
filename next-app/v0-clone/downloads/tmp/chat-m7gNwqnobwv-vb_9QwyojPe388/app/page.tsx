import { Default as Header } from "../components/Sitecore/Header"
import { Default as HeroSection } from "../components/Sitecore/HeroSection"
import { Default as StatsBar } from "../components/Sitecore/StatsBar"
import { Default as ConsultingSpecialists } from "../components/Sitecore/ConsultingSpecialists"
import { Default as WhyChooseUs } from "../components/Sitecore/WhyChooseUs"
import { Default as Testimonials } from "../components/Sitecore/Testimonials"
import { Default as QualityHealth } from "../components/Sitecore/QualityHealth"
import { Default as Newsletter } from "../components/Sitecore/Newsletter"
import { Default as Footer } from "../components/Sitecore/Footer"

export default function Page() {
  // Mock data for Header
  const headerProps = {
    rendering: { componentName: "Header" },
    fields: {
      logo: {
        value: {
          src: "/placeholder.svg?height=32&width=120",
          alt: "E-sheba",
        },
      },
      navigationItems: [
        {
          id: "1",
          fields: {
            title: { value: "Home" },
            link: { value: { href: "/" } },
          },
        },
        {
          id: "2",
          fields: {
            title: { value: "About" },
            link: { value: { href: "/about" } },
          },
        },
        {
          id: "3",
          fields: {
            title: { value: "Application" },
            link: { value: { href: "/application" } },
          },
        },
        {
          id: "4",
          fields: {
            title: { value: "History" },
            link: { value: { href: "/history" } },
          },
        },
      ],
      loginText: { value: "Log in" },
      loginLink: { value: { href: "/login" } },
      signupText: { value: "Sign up" },
      signupLink: { value: { href: "/signup" } },
    },
  }

  // Mock data for HeroSection
  const heroProps = {
    rendering: { componentName: "HeroSection" },
    fields: {
      title: { value: "Find & Search Your" },
      highlightedText: { value: "Favourite Doctor" },
      description: {
        value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus.",
      },
      doctorImage: {
        value: {
          src: "/placeholder.svg?height=600&width=500",
          alt: "Professional Doctor",
        },
      },
      ownerNamePlaceholder: { value: "Owner's Name" },
      locationPlaceholder: { value: "Location" },
      searchButtonText: { value: "Search" },
    },
  }

  // Mock data for StatsBar
  const statsProps = {
    rendering: { componentName: "StatsBar" },
    fields: {
      stats: [
        {
          id: "1",
          fields: {
            value: { value: "24/7" },
            label: { value: "Service" },
          },
        },
        {
          id: "2",
          fields: {
            value: { value: "100+" },
            label: { value: "Doctors" },
          },
        },
        {
          id: "3",
          fields: {
            value: { value: "1M+" },
            label: { value: "Active Patients" },
          },
        },
      ],
    },
  }

  // Mock data for ConsultingSpecialists
  const specialistsProps = {
    rendering: { componentName: "ConsultingSpecialists" },
    fields: {
      sectionTitle: { value: "Our Consulting Specialists" },
      cards: [
        {
          id: "1",
          fields: {
            icon: { value: "covid" },
            title: { value: "Covid-19 Test" },
            description: {
              value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus.",
            },
            featured: { value: "false" },
          },
        },
        {
          id: "2",
          fields: {
            icon: { value: "heart" },
            title: { value: "Heart Lungs" },
            description: {
              value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus.",
            },
            featured: { value: "true" },
          },
        },
        {
          id: "3",
          fields: {
            icon: { value: "supplement" },
            title: { value: "Supplement" },
            description: {
              value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus.",
            },
            featured: { value: "false" },
          },
        },
        {
          id: "4",
          fields: {
            icon: { value: "mental" },
            title: { value: "Mental Health" },
            description: {
              value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus.",
            },
            featured: { value: "false" },
          },
        },
      ],
    },
  }

  // Mock data for WhyChooseUs
  const whyChooseProps = {
    rendering: { componentName: "WhyChooseUs" },
    fields: {
      image: {
        value: {
          src: "/placeholder.svg?height=400&width=500",
          alt: "Medical Team",
        },
      },
      title: { value: "Why You Choose" },
      highlightedText: { value: "Us?" },
      checklist: [
        {
          id: "1",
          fields: {
            text: { value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
          },
        },
        {
          id: "2",
          fields: {
            text: { value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
          },
        },
        {
          id: "3",
          fields: {
            text: { value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
          },
        },
        {
          id: "4",
          fields: {
            text: { value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit." },
          },
        },
      ],
      linkText: { value: "Learn More" },
      link: { value: { href: "/about" } },
    },
  }

  // Mock data for Testimonials
  const testimonialsProps = {
    rendering: { componentName: "Testimonials" },
    fields: {
      title: { value: "What" },
      highlightedText: { value: "Our Member's Saying About Us" },
      description: {
        value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus.",
      },
      reviewerAvatars: [
        {
          id: "1",
          fields: {
            image: {
              value: {
                src: "/placeholder.svg?height=40&width=40",
                alt: "Reviewer 1",
              },
            },
          },
        },
        {
          id: "2",
          fields: {
            image: {
              value: {
                src: "/placeholder.svg?height=40&width=40",
                alt: "Reviewer 2",
              },
            },
          },
        },
        {
          id: "3",
          fields: {
            image: {
              value: {
                src: "/placeholder.svg?height=40&width=40",
                alt: "Reviewer 3",
              },
            },
          },
        },
        {
          id: "4",
          fields: {
            image: {
              value: {
                src: "/placeholder.svg?height=40&width=40",
                alt: "Reviewer 4",
              },
            },
          },
        },
        {
          id: "5",
          fields: {
            image: {
              value: {
                src: "/placeholder.svg?height=40&width=40",
                alt: "Reviewer 5",
              },
            },
          },
        },
      ],
      reviewCount: { value: "150+ Reviews" },
      testimonials: [
        {
          id: "1",
          fields: {
            authorImage: {
              value: {
                src: "/placeholder.svg?height=48&width=48",
                alt: "Jane Cooper",
              },
            },
            authorName: { value: "Jane Cooper" },
            date: { value: "2/3/22" },
            rating: { value: "5" },
            testimonialText: {
              value:
                "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sem veli viverra amet faucibus. Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
            },
          },
        },
      ],
    },
  }

  // Mock data for QualityHealth
  const qualityHealthProps = {
    rendering: { componentName: "QualityHealth" },
    fields: {
      title: { value: "The Future of" },
      highlightedText: { value: "Quality Health" },
      description: {
        value:
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nec diam consequat integer mi in rutrum elementum non, malesuada eu hac. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nec diam consequat integer mi in rutrum elementum non, malesuada eu hac elementum. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nec diam consequat integer mi in rutrum elementum non.",
      },
      linkText: { value: "Learn More" },
      link: { value: { href: "/services" } },
      image: {
        value: {
          src: "/placeholder.svg?height=400&width=500",
          alt: "Doctor and Patient",
        },
      },
    },
  }

  // Mock data for Newsletter
  const newsletterProps = {
    rendering: { componentName: "Newsletter" },
    fields: {
      title: { value: "Subscribe To Our Newsletter" },
      emailPlaceholder: { value: "Enter your email" },
      buttonAriaLabel: { value: "Subscribe to newsletter" },
    },
  }

  // Mock data for Footer
  const footerProps = {
    rendering: { componentName: "Footer" },
    fields: {
      logo: {
        value: {
          src: "/placeholder.svg?height=32&width=120",
          alt: "E-sheba",
        },
      },
      description: {
        value: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aliquam ac fermentum orci.",
      },
      socialLinks: [
        {
          id: "1",
          fields: {
            platform: { value: "facebook" },
            link: { value: { href: "https://facebook.com" } },
          },
        },
        {
          id: "2",
          fields: {
            platform: { value: "instagram" },
            link: { value: { href: "https://instagram.com" } },
          },
        },
        {
          id: "3",
          fields: {
            platform: { value: "twitter" },
            link: { value: { href: "https://twitter.com" } },
          },
        },
      ],
      usefulLinksTitle: { value: "Useful Links" },
      usefulLinks: [
        {
          id: "1",
          fields: {
            text: { value: "About Us" },
            link: { value: { href: "/about" } },
          },
        },
        {
          id: "2",
          fields: {
            text: { value: "Privacy Policy" },
            link: { value: { href: "/privacy" } },
          },
        },
        {
          id: "3",
          fields: {
            text: { value: "Careers" },
            link: { value: { href: "/careers" } },
          },
        },
        {
          id: "4",
          fields: {
            text: { value: "Our Team" },
            link: { value: { href: "/team" } },
          },
        },
      ],
      addressTitle: { value: "Address" },
      mapImage: {
        value: {
          src: "/placeholder.svg?height=128&width=300",
          alt: "Location Map",
        },
      },
      copyrightText: { value: "©2024 All Right reserved" },
    },
  }

  return (
    <main className="min-h-screen">
      <Header {...headerProps} />
      <HeroSection {...heroProps} />
      <StatsBar {...statsProps} />
      <ConsultingSpecialists {...specialistsProps} />
      <WhyChooseUs {...whyChooseProps} />
      <Testimonials {...testimonialsProps} />
      <QualityHealth {...qualityHealthProps} />
      <Newsletter {...newsletterProps} />
      <Footer {...footerProps} />
    </main>
  )
}
