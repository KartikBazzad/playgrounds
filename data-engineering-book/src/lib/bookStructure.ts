export interface Chapter {
  id: string;
  title: string;
  slug: string;
  sections: Section[];
}

export interface Section {
  id: string;
  title: string;
  slug: string;
  subsections?: Subsection[];
}

export interface Subsection {
  id: string;
  title: string;
  slug: string;
}

export const bookStructure: Chapter[] = [
  {
    id: "01",
    title: "Introduction to Data Engineering",
    slug: "introduction",
    sections: [
      {
        id: "01-01",
        title: "What is Data Engineering?",
        slug: "what-is-data-engineering"
      },
      {
        id: "01-02",
        title: "Data Engineering vs Data Science",
        slug: "data-engineering-vs-data-science"
      },
      {
        id: "01-03",
        title: "The Data Engineering Lifecycle",
        slug: "data-engineering-lifecycle"
      },
      {
        id: "01-04",
        title: "Modern Data Stack",
        slug: "modern-data-stack"
      }
    ]
  },
  {
    id: "02",
    title: "Data Architecture Fundamentals",
    slug: "data-architecture",
    sections: [
      {
        id: "02-01",
        title: "Data Architecture Patterns",
        slug: "architecture-patterns"
      },
      {
        id: "02-02",
        title: "Lambda vs Kappa Architecture",
        slug: "lambda-vs-kappa"
      },
      {
        id: "02-03",
        title: "Data Mesh and Data Fabric",
        slug: "data-mesh-fabric"
      },
      {
        id: "02-04",
        title: "Cloud vs On-Premise",
        slug: "cloud-vs-onpremise"
      }
    ]
  },
  {
    id: "03",
    title: "Data Storage Systems",
    slug: "data-storage",
    sections: [
      {
        id: "03-01",
        title: "Relational Databases",
        slug: "relational-databases"
      },
      {
        id: "03-02",
        title: "NoSQL Databases",
        slug: "nosql-databases"
      },
      {
        id: "03-03",
        title: "Data Warehouses",
        slug: "data-warehouses"
      },
      {
        id: "03-04",
        title: "Data Lakes",
        slug: "data-lakes"
      },
      {
        id: "03-05",
        title: "Object Storage",
        slug: "object-storage"
      }
    ]
  },
  {
    id: "04",
    title: "Data Ingestion",
    slug: "data-ingestion",
    sections: [
      {
        id: "04-01",
        title: "Batch vs Stream Processing",
        slug: "batch-vs-stream"
      },
      {
        id: "04-02",
        title: "ETL vs ELT",
        slug: "etl-vs-elt"
      },
      {
        id: "04-03",
        title: "Data Integration Patterns",
        slug: "integration-patterns"
      },
      {
        id: "04-04",
        title: "Change Data Capture (CDC)",
        slug: "change-data-capture"
      }
    ]
  },
  {
    id: "05",
    title: "Stream Processing",
    slug: "stream-processing",
    sections: [
      {
        id: "05-01",
        title: "Apache Kafka",
        slug: "apache-kafka"
      },
      {
        id: "05-02",
        title: "Apache Spark Streaming",
        slug: "spark-streaming"
      },
      {
        id: "05-03",
        title: "Apache Flink",
        slug: "apache-flink"
      },
      {
        id: "05-04",
        title: "Event-Driven Architecture",
        slug: "event-driven-architecture"
      }
    ]
  },
  {
    id: "06",
    title: "Data Processing Frameworks",
    slug: "data-processing",
    sections: [
      {
        id: "06-01",
        title: "Apache Spark",
        slug: "apache-spark"
      },
      {
        id: "06-02",
        title: "Apache Hadoop",
        slug: "apache-hadoop"
      },
      {
        id: "06-03",
        title: "Dask and Ray",
        slug: "dask-ray"
      },
      {
        id: "06-04",
        title: "Serverless Computing",
        slug: "serverless-computing"
      }
    ]
  },
  {
    id: "07",
    title: "Data Quality and Governance",
    slug: "data-quality",
    sections: [
      {
        id: "07-01",
        title: "Data Quality Frameworks",
        slug: "quality-frameworks"
      },
      {
        id: "07-02",
        title: "Data Lineage",
        slug: "data-lineage"
      },
      {
        id: "07-03",
        title: "Data Cataloging",
        slug: "data-cataloging"
      },
      {
        id: "07-04",
        title: "Data Privacy and Security",
        slug: "privacy-security"
      }
    ]
  },
  {
    id: "08",
    title: "Monitoring and Observability",
    slug: "monitoring",
    sections: [
      {
        id: "08-01",
        title: "Pipeline Monitoring",
        slug: "pipeline-monitoring"
      },
      {
        id: "08-02",
        title: "Data Observability",
        slug: "data-observability"
      },
      {
        id: "08-03",
        title: "Alerting and Incident Response",
        slug: "alerting-incident-response"
      },
      {
        id: "08-04",
        title: "Performance Optimization",
        slug: "performance-optimization"
      }
    ]
  },
  {
    id: "09",
    title: "DevOps for Data Engineering",
    slug: "devops",
    sections: [
      {
        id: "09-01",
        title: "DataOps Principles",
        slug: "dataops-principles"
      },
      {
        id: "09-02",
        title: "CI/CD for Data Pipelines",
        slug: "cicd-pipelines"
      },
      {
        id: "09-03",
        title: "Infrastructure as Code",
        slug: "infrastructure-as-code"
      },
      {
        id: "09-04",
        title: "Testing Data Pipelines",
        slug: "testing-pipelines"
      }
    ]
  },
  {
    id: "10",
    title: "Case Studies and Best Practices",
    slug: "case-studies",
    sections: [
      {
        id: "10-01",
        title: "Building a Real-time Analytics Platform",
        slug: "realtime-analytics"
      },
      {
        id: "10-02",
        title: "Data Migration Strategies",
        slug: "migration-strategies"
      },
      {
        id: "10-03",
        title: "Scaling Data Systems",
        slug: "scaling-systems"
      },
      {
        id: "10-04",
        title: "Cost Optimization",
        slug: "cost-optimization"
      }
    ]
  }
];

export function getAllChapters(): Chapter[] {
  return bookStructure;
}

export function getChapterBySlug(slug: string): Chapter | undefined {
  return bookStructure.find(chapter => chapter.slug === slug);
}

export function getSectionBySlug(chapterSlug: string, sectionSlug: string): Section | undefined {
  const chapter = getChapterBySlug(chapterSlug);
  return chapter?.sections.find(section => section.slug === sectionSlug);
}

export function getNavigationData() {
  return bookStructure.map(chapter => ({
    ...chapter,
    sections: chapter.sections.map(section => ({
      ...section,
      href: `/chapters/${chapter.slug}/${section.slug}`
    }))
  }));
}
