package com.jpa.playground

import jakarta.persistence.*
import org.springframework.data.repository.CrudRepository

@Entity
class Author(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    val name: String,
    
    @OneToMany(mappedBy = "author", cascade = [CascadeType.ALL], fetch = FetchType.EAGER)
    val books: MutableList<Book> = mutableListOf()
)

@Entity
class Book(
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    val id: Long? = null,
    val title: String,

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    var author: Author? = null
)

interface AuthorRepository : CrudRepository<Author, Long>
interface BookRepository : CrudRepository<Book, Long>
